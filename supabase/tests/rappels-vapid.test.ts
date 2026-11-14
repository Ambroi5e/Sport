import { describe, expect, it } from "vitest";
import { generateVapidKeys, isPushEndpoint, PUSH_HOSTS, vapidAuthorization, VAPID_TTL_S } from "../functions/rappels/vapid";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("adresse de signal", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://db5p.notify.windows.com/w/?token=abc",
  ])("accepte %s", (url) => {
    expect(isPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.exemple.test/abc",
    "https://exemplegoogleapis.com/abc",
    "https://fcm.googleapis.com:8443/abc",
    "https://moi@fcm.googleapis.com/abc",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/abc",
    "pas une adresse",
    42,
    `https://fcm.googleapis.com/${"a".repeat(1000)}`,
  ])("refuse %s", (url) => {
    expect(isPushEndpoint(url)).toBe(false);
  });

  it("la contrainte en base nomme les mêmes services", () => {
    const sql = readFileSync(join(__dirname, "../migrations/20261122000000_rappels.sql"), "utf8");
    for (const host of PUSH_HOSTS) expect(sql).toContain(host.replaceAll(".", "\\."));
  });
});

describe("signature VAPID", () => {
  it("produit un jeton ES256 que la clé publique vérifie", async () => {
    const { publicKey, privateJwk } = await generateVapidKeys();
    const raw = Buffer.from(publicKey, "base64url");
    expect(raw).toHaveLength(65);
    expect(raw[0]).toBe(4);

    const now = Date.UTC(2026, 10, 14, 12);
    const value = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", "https://fonte.example", publicKey, privateJwk, now);
    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(value);
    expect(match).not.toBeNull();
    const [, header, claims, signature, k] = match!;
    expect(k).toBe(publicKey);
    expect(decode(header)).toEqual({ typ: "JWT", alg: "ES256" });
    expect(decode(claims)).toEqual({ aud: "https://fcm.googleapis.com", exp: now / 1000 + VAPID_TTL_S, sub: "https://fonte.example" });

    const key = await crypto.subtle.importKey("raw", raw, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const signed = new TextEncoder().encode(`${header}.${claims}`);
    const bytes = Buffer.from(signature, "base64url");
    expect(bytes).toHaveLength(64);
    expect(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, bytes, signed)).toBe(true);
    signed[0] ^= 1;
    expect(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, bytes, signed)).toBe(false);
  });
});
