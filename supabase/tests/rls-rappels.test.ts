import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";

describe.skipIf(!adminUrl)("RLS rappels", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  /** Rappels dus à cet instant, « personne:rappel », triés. */
  const due = async (now: string) =>
    (await client.query("select user_id, kind from private.due_reminders($1) order by kind", [now])).rows.map((r) => `${r.user_id === alice ? "alice" : "bruno"}:${r.kind}`);

  /** Dans une transaction déjà ouverte : la requête lancée comme Alice. */
  const asUserInside = async (sql: string) => {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [alice]);
    const value = (await client.query(sql)).rows[0].k;
    await client.query("reset role");
    return value;
  };

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      // Séance à 18 h du lundi au vendredi, forme à 7 h 30, compléments à 8 h, bilan le dimanche à 18 h.
      await client.query(
        "insert into public.reminder_settings (workout_at, workout_days, checkin_at, supplements_at, review_at) values ('18:00', '{1,2,3,4,5}', '07:30', '08:00', '18:00')",
      );
      await client.query("insert into public.push_subscriptions (endpoint) values ($1)", [ENDPOINT]);
      await client.query("insert into public.reminder_log (kind, sent_on) values ('forme', '2026-11-01')");
    });
    // Bruno a réglé un rappel mais n'a abonné aucun appareil.
    await asUserCommit(client, bruno, async () => {
      await client.query("insert into public.reminder_settings (checkin_at) values ('07:30')");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["reminder_settings", "push_subscriptions", "reminder_log"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno ne voit pas celles d'Alice", async () => {
      const count = (user: string) =>
        asUser(client, user, async () => (await client.query(`select count(*)::int as n from public.${table} where user_id = $1`, [alice])).rows[0].n);
      expect(await count(alice)).toBe(1);
      expect(await count(bruno)).toBe(0);
    });

    it("Bruno ne peut ni modifier ni supprimer les lignes d'Alice", async () => {
      const result = await asUser(client, bruno, async () => {
        const updated = await client.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]);
        const deleted = await client.query(`delete from public.${table} where user_id = $1`, [alice]);
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });

    it("un visiteur ne voit rien", async () => {
      const n = await asUser(client, null, async () => (await client.query(`select count(*)::int as n from public.${table}`)).rows[0].n);
      expect(n).toBe(0);
    });
  });

  it("Bruno ne peut pas abonner un appareil au nom d'Alice", async () => {
    await expect(
      asUser(client, bruno, () => client.query("insert into public.push_subscriptions (user_id, endpoint) values ($1, $2)", [alice, `${ENDPOINT}-b`])),
    ).rejects.toThrow(/row-level security/);
  });

  it.each(["https://exemple.test/push/1", "http://fcm.googleapis.com/fcm/send/x", "https://fcm.googleapis.com.exemple.test/x", "https://169.254.169.254/latest"])(
    "refuse l'adresse %s",
    async (endpoint) => {
      await expect(asUser(client, alice, () => client.query("insert into public.push_subscriptions (endpoint) values ($1)", [endpoint]))).rejects.toThrow(
        /check constraint/,
      );
    },
  );

  it.each(["https://updates.push.services.mozilla.com/wpush/v2/abc", "https://web.push.apple.com/abc", "https://db5p.notify.windows.com/w/?token=abc"])(
    "accepte l'adresse %s",
    async (endpoint) => {
      const n = await asUser(client, alice, async () => (await client.query("insert into public.push_subscriptions (endpoint) values ($1)", [endpoint])).rowCount);
      expect(n).toBe(1);
    },
  );

  it("refuse un jour de séance hors de la semaine", async () => {
    await expect(asUser(client, alice, () => client.query("update public.reminder_settings set workout_days = '{0,8}'"))).rejects.toThrow(/check constraint/);
  });

  it("personne ne peut appeler les fonctions d'envoi par l'API", async () => {
    for (const user of [alice, null]) {
      await expect(asUser(client, user, () => client.query("select * from private.due_reminders(now())"))).rejects.toThrow(/permission denied/);
      await expect(asUser(client, user, () => client.query("select private.dispatch_reminders()"))).rejects.toThrow(/permission denied/);
    }
  });

  describe("rappels dus (heure de Paris, UTC+1 en novembre)", () => {
    // Mardi 10 novembre 2026.
    it("rien avant l'heure, le rappel dans l'heure qui suit, plus rien après", async () => {
      expect(await due("2026-11-10T06:29:00Z")).toEqual([]);
      expect(await due("2026-11-10T06:30:00Z")).toEqual(["alice:forme"]);
      expect(await due("2026-11-10T07:05:00Z")).toEqual(["alice:forme"]);
      expect(await due("2026-11-10T07:35:00Z")).toEqual([]);
    });

    it("la séance les jours cochés seulement, le bilan le dimanche seulement", async () => {
      expect(await due("2026-11-10T17:10:00Z")).toEqual(["alice:seance"]);
      // Samedi 14 : pas un jour de séance. Dimanche 15 : bilan, pas de séance.
      expect(await due("2026-11-14T17:10:00Z")).toEqual([]);
      expect(await due("2026-11-15T17:10:00Z")).toEqual(["alice:bilan"]);
    });

    it("pas de rappel de compléments sans complément à prendre", async () => {
      expect(await due("2026-11-10T07:10:00Z")).toEqual(["alice:forme"]);
    });

    it("sans appareil abonné, rien n'est dû", async () => {
      expect((await due("2026-11-10T06:40:00Z")).filter((d) => d.startsWith("bruno"))).toEqual([]);
    });

    it("un rappel devenu inutile ou déjà envoyé ne part pas", async () => {
      await client.query("begin");
      try {
        await client.query("insert into public.supplements (user_id, name) values ($1, 'Créatine')", [alice]);
        expect(await due("2026-11-10T07:10:00Z")).toEqual(["alice:complements", "alice:forme"]);
        await client.query("insert into public.supplement_logs (supplement_id, user_id, taken_on) select id, user_id, '2026-11-10' from public.supplements");
        await client.query("insert into public.daily_checkins (user_id, checkin_on, sleep, soreness, energy, stress) values ($1, '2026-11-10', 4, 2, 4, 2)", [alice]);
        expect(await due("2026-11-10T07:10:00Z")).toEqual([]);

        await client.query("insert into public.weekly_reviews (user_id, week_start, feeling) values ($1, '2026-11-09', 4)", [alice]);
        expect(await due("2026-11-15T17:10:00Z")).toEqual([]);

        expect(await due("2026-11-11T17:10:00Z")).toEqual(["alice:seance"]);
        await client.query("update public.reminder_log set kind = 'seance', sent_on = '2026-11-11' where user_id = $1", [alice]);
        expect(await due("2026-11-11T17:10:00Z")).toEqual([]);
        expect(await due("2026-11-12T17:10:00Z")).toEqual(["alice:seance"]);
      } finally {
        await client.query("rollback");
      }
    });

    it("sans clés dans le coffre, l'envoi ne note rien ; la clé publique se lit, pas le coffre", async () => {
      await client.query("begin");
      try {
        await client.query("create schema vault");
        await client.query("create table vault.decrypted_secrets (name text, decrypted_secret text)");
        expect((await client.query("select private.dispatch_reminders() as n")).rows[0].n).toBe(0);
        expect((await client.query("select count(*)::int as n from public.reminder_log")).rows[0].n).toBe(1);
        expect((await client.query("select public.push_public_key() as k")).rows[0].k).toBeNull();
        await client.query("insert into vault.decrypted_secrets values ('rappels_vapid_public', 'BPublique')");
        expect(await asUserInside("select public.push_public_key() as k")).toBe("BPublique");
      } finally {
        await client.query("rollback");
      }
    });
  });
});
