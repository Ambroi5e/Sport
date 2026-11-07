import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS programme", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let benchId: string;
  let aliceExerciseId: string;
  let programId: string;

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
    benchId = (await one<{ id: string }>("select id from public.exercises where slug = 'developpe-couche-barre'")).id;

    await asUserCommit(client, alice, async () => {
      aliceExerciseId = (await one<{ id: string }>("insert into public.exercises (name, equipment, measure, primary_muscles) values ('Presse maison', 'machine', 'charge', '{pectoraux}') returning id")).id;
      programId = (
        await one<{ id: string }>(
          `insert into public.programs (name, starts_on, sessions_per_week, session_minutes, equipment, priority_muscles, goal_exercise_id, goal_kg, goal_date)
           values ('Haut du corps', '2026-11-09', 3, 60, '{barre,halteres,machine,poulie}', '{pectoraux}', $1, 100, '2027-05-01') returning id`,
          [benchId],
        )
      ).id;
      await client.query("insert into public.workout_templates (name, program_id) values ('Haut A', $1)", [programId]);
      await client.query("insert into public.exercise_preferences (exercise_id, preference) values ($1, 'aime')", [benchId]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["programs", "exercise_preferences"])("%s", (table) => {
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

  describe("programmes", () => {
    it("un seul programme en cours par personne", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.programs (name, starts_on, sessions_per_week, session_minutes, equipment) values ('Deuxième', '2026-11-10', 4, 60, '{barre}')"),
        ),
      ).rejects.toThrow(/duplicate key/);
    });

    it("l'objectif ne peut pas viser l'exercice personnel d'un autre", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query(
            "insert into public.programs (name, starts_on, sessions_per_week, session_minutes, equipment, goal_exercise_id, goal_kg) values ('Vol', '2026-11-10', 3, 60, '{machine}', $1, 80)",
            [aliceExerciseId],
          ),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("un objectif a une charge, et une charge a un objectif", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.programs (name, starts_on, sessions_per_week, session_minutes, equipment, goal_kg) values ('Sans exercice', '2026-11-10', 3, 60, '{barre}', 80)"),
        ),
      ).rejects.toThrow(/check constraint/);
    });

    it("Bruno ne peut pas rattacher un modèle au programme d'Alice", async () => {
      await expect(
        asUser(client, bruno, () => client.query("insert into public.workout_templates (name, program_id) values ('Intrus', $1)", [programId])),
      ).rejects.toThrow(/foreign key/);
    });

    it("supprimer le programme supprime ses séances", async () => {
      const left = await asUser(client, alice, async () => {
        await client.query("delete from public.programs where id = $1", [programId]);
        return (await client.query("select count(*)::int as n from public.workout_templates where program_id is not null")).rows[0].n;
      });
      expect(left).toBe(0);
    });
  });

  describe("préférences", () => {
    it("une seule préférence par exercice", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.exercise_preferences (exercise_id, preference) values ($1, 'evite')", [benchId])),
      ).rejects.toThrow(/duplicate key/);
    });

    it("pas de préférence sur l'exercice personnel d'un autre", async () => {
      await expect(
        asUser(client, bruno, () => client.query("insert into public.exercise_preferences (exercise_id, preference) values ($1, 'aime')", [aliceExerciseId])),
      ).rejects.toThrow(/row-level security/);
    });
  });
});
