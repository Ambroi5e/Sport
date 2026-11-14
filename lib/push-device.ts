/** Abonnement push de cet appareil, côté navigateur. */

export type PushSupport = "ok" | "unsupported" | "ios-install" | "no-worker";

/** Ce que cet appareil sait faire. Sur iPhone, les notifications web demandent l'app installée. */
export async function pushSupport(): Promise<{ support: PushSupport; registration: ServiceWorkerRegistration | null }> {
  if (typeof window === "undefined") return { support: "unsupported", registration: null };
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) return { support: "ios-install", registration: null };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { support: "unsupported", registration: null };
  const registration = (await navigator.serviceWorker.getRegistration()) ?? null;
  return registration ? { support: "ok", registration } : { support: "no-worker", registration: null };
}

/** Clé publique VAPID (base64url) en octets, comme l'attend `pushManager.subscribe`. */
export function keyBytes(publicKey: string): Uint8Array<ArrayBuffer> {
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=");
  const text = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(text.length));
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

/**
 * À la déconnexion : cet appareil ne reçoit plus de signal. L'adresse devient
 * invalide côté service de notifications, Fonte la retire au prochain envoi refusé.
 */
export function forgetPushDevice() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.pushManager?.getSubscription())
    .then((subscription) => subscription?.unsubscribe())
    .catch(() => {});
}
