/**
 * Copie hors ligne de la séance en cours, gardée par le service worker
 * (public/sw.js). Une seule page à la fois, effacée à la fin de la séance et à
 * la déconnexion : c'est la seule page personnelle que l'app met en cache.
 */

function post(message: { type: "garder-seance" | "oublier-seance"; url?: string; refresh?: boolean }) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage(message)).catch(() => {});
}

/**
 * Garde une copie de la page de séance donnée. Avec `refresh`, la recharge même
 * si elle est déjà gardée (après l'envoi de séries, pour qu'elle reste à jour).
 */
export function keepSessionCopy(path: string, refresh = false) {
  post({ type: "garder-seance", url: path, refresh });
}

/** Efface la copie, seulement si c'est celle de cette page quand `path` est donné. */
export function forgetSessionCopy(path?: string) {
  post({ type: "oublier-seance", url: path });
}

/** Nom du cache, partagé avec le service worker et la page hors ligne. */
export const SESSION_CACHE = "fonte-seance";
