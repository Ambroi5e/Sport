import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS sports et forme du jour", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");

    await asUserCommit(client, alice, async () => {
      await client.query("insert into public.activities (performed_on, sport, duration_minutes, intensity) values ('2026-11-05', 'padel', 90, 'intense')");
      await client.query(
        "insert into public.activities (performed_on, sport, label, duration_minutes, intensity) values ('2026-11-06', 'autre', 'Paddle', 60, 'legere')",
      );
      await client.query("insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values ('2026-11-06', 4, 2, 4, 2)");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["activities", "daily_checkins"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno aucune", async () => {
      const count = (user: string) =>
        asUser(client, user, async () => (await client.query(`select count(*)::int as n from public.${table} where user_id = $1`, [alice])).rows[0].n);
      expect(await count(alice)).toBeGreaterThan(0);
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

  describe("activités", () => {
    it("Bruno ne peut pas noter une activité au nom d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.activities (user_id, performed_on, sport, duration_minutes, intensity) values ($1, '2026-11-06', 'foot', 60, 'moderee')", [
            alice,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("un nom libre seulement pour « autre », et toujours pour « autre »", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.activities (performed_on, sport, label, duration_minutes, intensity) values ('2026-11-06', 'padel', 'Padel', 60, 'moderee')"),
        ),
      ).rejects.toThrow(/check constraint/);
      await expect(
        asUser(client, alice, () => client.query("insert into public.activities (performed_on, sport, duration_minutes, intensity) values ('2026-11-06', 'autre', 60, 'moderee')")),
      ).rejects.toThrow(/check constraint/);
    });

    it("refuse une durée impossible", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.activities (performed_on, sport, duration_minutes, intensity) values ('2026-11-06', 'foot', 900, 'moderee')")),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("forme du jour", () => {
    it("un seul check-in par jour : le refaire passe par la mise à jour", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values ('2026-11-06', 2, 4, 2, 4)")),
      ).rejects.toThrow(/duplicate key/);
      const sleep = await asUser(client, alice, async () => {
        await client.query(
          "insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values ('2026-11-06', 2, 4, 2, 4) on conflict (user_id, checkin_on) do update set sleep = excluded.sleep",
        );
        return (await client.query("select sleep from public.daily_checkins where checkin_on = '2026-11-06'")).rows[0].sleep;
      });
      expect(sleep).toBe(2);
    });

    it("Bruno peut faire son check-in le même jour qu'Alice", async () => {
      const n = await asUser(client, bruno, async () => {
        await client.query("insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values ('2026-11-06', 3, 3, 3, 3)");
        return (await client.query("select count(*)::int as n from public.daily_checkins")).rows[0].n;
      });
      expect(n).toBe(1);
    });

    it("refuse une note hors de 1 à 5", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values ('2026-11-07', 0, 3, 3, 6)")),
      ).rejects.toThrow(/check constraint/);
    });
  });
});
