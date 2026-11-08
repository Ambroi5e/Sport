import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS planning", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let aliceTemplate: string;
  let brunoTemplate: string;

  async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
    const { rows } = await client.query(sql, params);
    return rows[0] as T;
  }

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");

    await asUserCommit(client, alice, async () => {
      aliceTemplate = (await one<{ id: string }>("insert into public.workout_templates (name) values ('Bas A') returning id")).id;
      await client.query("insert into public.weekly_sports (weekday, sport, duration_minutes, intensity) values (3, 'padel', 90, 'intense')");
      await client.query("insert into public.session_pins (week_start, template_id, planned_on) values ('2026-11-09', $1, '2026-11-12')", [aliceTemplate]);
      await client.query("insert into public.blocked_days (blocked_on) values ('2026-11-13')");
    });
    await asUserCommit(client, bruno, async () => {
      brunoTemplate = (await one<{ id: string }>("insert into public.workout_templates (name) values ('Full body') returning id")).id;
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["weekly_sports", "session_pins", "blocked_days"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno aucune", async () => {
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

  describe("sports fixes", () => {
    it("Bruno ne peut pas ajouter un sport fixe au nom d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.weekly_sports (user_id, weekday, sport, duration_minutes, intensity) values ($1, 6, 'foot', 60, 'moderee')", [alice]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("refuse un jour hors de 1 à 7 et un nom libre hors de « autre »", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.weekly_sports (weekday, sport, duration_minutes, intensity) values (8, 'foot', 60, 'moderee')")),
      ).rejects.toThrow(/check constraint/);
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.weekly_sports (weekday, sport, label, duration_minutes, intensity) values (6, 'foot', 'Five', 60, 'moderee')"),
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("séances déplacées", () => {
    it("Alice ne peut pas déplacer une séance de Bruno, même en connaissant son identifiant", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.session_pins (week_start, template_id, planned_on) values ('2026-11-09', $1, '2026-11-10')", [brunoTemplate]),
        ),
      ).rejects.toThrow(/foreign key/);
    });

    it("la semaine commence un lundi et le jour choisi est dans la semaine", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.session_pins (week_start, template_id, planned_on) values ('2026-11-10', $1, '2026-11-11')", [aliceTemplate]),
        ),
      ).rejects.toThrow(/check constraint/);
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.session_pins (week_start, template_id, planned_on) values ('2026-11-16', $1, '2026-11-23')", [aliceTemplate]),
        ),
      ).rejects.toThrow(/check constraint/);
    });

    it("déplacer de nouveau la même séance passe par la mise à jour", async () => {
      const day = await asUser(client, alice, async () => {
        await client.query(
          "insert into public.session_pins (week_start, template_id, planned_on) values ('2026-11-09', $1, '2026-11-14') on conflict (user_id, week_start, template_id) do update set planned_on = excluded.planned_on",
          [aliceTemplate],
        );
        return (await client.query("select planned_on::text as d from public.session_pins where template_id = $1", [aliceTemplate])).rows[0].d;
      });
      expect(day).toBe("2026-11-14");
    });

    it("supprimer la séance retire ses déplacements", async () => {
      const n = await asUser(client, alice, async () => {
        await client.query("delete from public.workout_templates where id = $1", [aliceTemplate]);
        return (await client.query("select count(*)::int as n from public.session_pins")).rows[0].n;
      });
      expect(n).toBe(0);
    });
  });

  it("un jour sans séance une seule fois : le refaire ne change rien", async () => {
    const n = await asUser(client, alice, async () => {
      await client.query("insert into public.blocked_days (blocked_on) values ('2026-11-13') on conflict do nothing");
      return (await client.query("select count(*)::int as n from public.blocked_days")).rows[0].n;
    });
    expect(n).toBe(1);
    await expect(
      asUser(client, bruno, () => client.query("insert into public.blocked_days (user_id, blocked_on) values ($1, '2026-11-14')", [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("une séance n'est pas allégée par défaut", async () => {
    const light = await asUser(client, alice, async () => {
      await client.query("insert into public.workouts (name, performed_on) values ('Bas A', '2026-11-09')");
      return (await client.query("select is_light from public.workouts")).rows[0].is_light;
    });
    expect(light).toBe(false);
  });
});
