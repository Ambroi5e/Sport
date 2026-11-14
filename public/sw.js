/* Service worker Fonte (v0.3).
 * - Fichiers statiques versionnés (/_next/static, icônes, polices) : cache d'abord.
 * - Pages : toujours le réseau ; en cas d'échec, la page hors ligne.
 * - Une seule exception aux pages personnelles : la copie de la séance en cours,
 *   demandée par la page elle-même, pour la rouvrir sans réseau à la salle.
 *   Elle est effacée à la fin de la séance et à la déconnexion.
 * - Rappels (v0.10.3) : le signal push arrive vide ; le texte est demandé à Fonte
 *   avec la session de la personne, puis affiché.
 */
const VERSION = "fonte-v0.10.3";
const STATIC_CACHE = `${VERSION}-static`;
const SESSION_CACHE = "fonte-seance";
const OFFLINE_URL = "/hors-ligne";
const SESSION_PATH = /^\/entrainement\/seance\/[0-9a-f-]{36}$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icon.svg"]);
      // La page hors ligne a besoin de ses scripts pour proposer de reprendre la séance gardée.
      const offline = await cache.match(OFFLINE_URL);
      if (offline) await precacheAssets(await offline.text()).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== SESSION_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Garde la page de séance, en remplaçant toute autre séance gardée. */
async function keepSession(path, refresh) {
  const cache = await caches.open(SESSION_CACHE);
  if (!refresh && (await cache.match(path))) return;
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  const html = (response.headers.get("content-type") || "").includes("text/html");
  // Redirigé (session expirée, séance supprimée) : rien à garder.
  if (!response.ok || response.redirected || !html) return;
  const text = await response.clone().text();
  for (const key of await cache.keys()) {
    if (new URL(key.url).pathname !== path) await cache.delete(key);
  }
  await cache.put(path, response);
  await precacheAssets(text);
}

/**
 * Met en cache les fichiers JS et CSS que la page gardée utilise, pour qu'elle
 * fonctionne hors ligne même s'ils n'ont jamais été chargés (après une mise à jour de l'app).
 */
async function precacheAssets(html) {
  const paths = new Set();
  for (const match of html.matchAll(/(?:\/_next\/)?(static\/(?:chunks|css|media)\/[^"'\\()\s]+)/g)) paths.add(`/_next/${match[1]}`);
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    [...paths].map(async (path) => {
      if (await cache.match(path)) return;
      const response = await fetch(path).catch(() => null);
      if (response && response.ok) await cache.put(path, response);
    }),
  );
}

async function forgetSession(path) {
  if (!path) {
    await caches.delete(SESSION_CACHE);
    return;
  }
  const cache = await caches.open(SESSION_CACHE);
  await cache.delete(path);
}

self.addEventListener("message", (event) => {
  const { type, url, refresh } = event.data || {};
  if (event.origin && event.origin !== self.location.origin) return;
  if (type === "garder-seance" && typeof url === "string" && SESSION_PATH.test(url)) {
    event.waitUntil(keepSession(url, refresh === true).catch(() => {}));
  } else if (type === "oublier-seance") {
    event.waitUntil(forgetSession(typeof url === "string" ? url : undefined).catch(() => {}));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (SESSION_PATH.test(url.pathname)) {
      event.respondWith(
        fetch(request).catch(async () => {
          const copy = await caches.match(url.pathname, { cacheName: SESSION_CACHE, ignoreSearch: true, ignoreVary: true });
          return copy || caches.match(OFFLINE_URL);
        }),
      );
      return;
    }
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

const REMINDERS_URL = "/reglages/rappels/a-afficher";
const FALLBACK_REMINDER = { tag: "rappel", title: "Fonte", body: "Un rappel t'attend.", url: "/" };

/** Les rappels à afficher ; sans réseau ou sans session, un rappel sans détail. */
async function remindersToShow() {
  try {
    const response = await fetch(REMINDERS_URL, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    const json = (response.headers.get("content-type") || "").includes("application/json");
    if (response.ok && !response.redirected && json) {
      const list = await response.json();
      if (Array.isArray(list) && list.length) return list.slice(0, 4);
    }
  } catch {
    // Hors ligne : on affiche le rappel sans détail.
  }
  return [FALLBACK_REMINDER];
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    remindersToShow().then((list) =>
      Promise.all(
        list.map((n) =>
          self.registration.showNotification(String(n.title || FALLBACK_REMINDER.title), {
            body: String(n.body || ""),
            tag: String(n.tag || FALLBACK_REMINDER.tag),
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            // Seulement une page de l'app : jamais une adresse venue d'ailleurs.
            data: { url: typeof n.url === "string" && n.url.startsWith("/") && !n.url.startsWith("//") ? n.url : "/" },
          }),
        ),
      ),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
