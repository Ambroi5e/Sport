/**
 * Signature VAPID (RFC 8292) d'un signal push sans contenu, avec WebCrypto seul :
 * le même code tourne dans l'Edge Function (Deno) et dans les tests (Node).
 */

/** Services de notifications acceptés : la même liste que la contrainte de `push_subscriptions`. */
export const PUSH_HOSTS = ["googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"] as const;

/** Une adresse de signal valable : https, sans port ni identifiants, chez un service connu. */
export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  return PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

function base64url(bytes: Uint8Array): string {
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));

/** Durée de validité du jeton : 12 heures (le maximum admis est 24). */
export const VAPID_TTL_S = 12 * 3600;

/**
 * En-tête `Authorization` pour une adresse de signal : un JWT ES256 dont l'audience
 * est l'origine du service de notifications, suivi de la clé publique.
 */
export async function vapidAuthorization(endpoint: string, subject: string, publicKey: string, privateJwk: JsonWebKey, nowMs: number): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = encode({ typ: "JWT", alg: "ES256" });
  const claims = encode({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + VAPID_TTL_S, sub: subject });
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${base64url(new Uint8Array(signature))}, k=${publicKey}`;
}

/** Une paire de clés neuve : la clé publique (65 octets, base64url) et la clé privée en JWK. */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return { publicKey: base64url(raw), privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey) };
}
