/**
 * Edge Function `rappels` : relais sans mémoire ni secret. La base (pg_cron) lui poste
 * les adresses à réveiller et la paire de clés VAPID ; elle signe et envoie un signal
 * vide à chacune, puis répond en listant les adresses que le service déclare périmées.
 * Elle ne lit ni n'écrit rien en base et n'accepte que les services de notifications connus.
 */
import { isPushEndpoint, vapidAuthorization } from "./vapid.ts";

const MAX_ENDPOINTS = 500;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { endpoints?: unknown; publicKey?: unknown; privateJwk?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { endpoints, publicKey, privateJwk } = body;
  if (!Array.isArray(endpoints) || endpoints.length > MAX_ENDPOINTS || typeof publicKey !== "string" || !privateJwk || typeof privateJwk !== "object") {
    return json({ error: "invalid_body" }, 400);
  }

  const subject = new URL(request.url).origin.replace(/^http:/, "https:");
  const now = Date.now();
  const gone: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    endpoints.filter(isPushEndpoint).map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: await vapidAuthorization(endpoint, subject, publicKey, privateJwk as JsonWebKey, now), TTL: "3600", Urgency: "normal", "Content-Length": "0" },
          redirect: "manual",
          signal: AbortSignal.timeout(10_000),
        });
        await response.body?.cancel();
        if (response.status === 404 || response.status === 410) gone.push(endpoint);
        else if (response.ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  return json({ fonte_rappels: true, sent, failed, gone });
});
