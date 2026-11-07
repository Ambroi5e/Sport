import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS musculation", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let benchId: string;
  let aliceExerciseId: string;
  let aliceWorkoutId: string;
  let aliceTemplateId: string;

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
      aliceExerciseId = (
        await one<{ id: string }>(
          "insert into public.exercises (name, equipment, primary_muscles) values ('Développé Smith', 'machine', '{pectoraux}') returning id",
        )
      ).id;
      aliceTemplateId = (await one<{ id: string }>("insert into public.workout_templates (name) values ('Push') returning id")).id;
      await client.query("insert into public.template_items (template_id, exercise_id, sets, rep_min, rep_max) values ($1, $2, 3, 8, 12)", [
        aliceTemplateId,
        benchId,
      ]);
      aliceWorkoutId = (
        await one<{ id: string }>("insert into public.workouts (name, performed_on) values ('Push', '2026-11-08') returning id")
      ).id;
      await client.query(
        "insert into public.workout_sets (workout_id, exercise_id, set_number, weight_kg, reps, completed_at) values ($1, $2, 1, 80, 10, now()), ($1, $3, 1, 60, 12, now())",
        [aliceWorkoutId, benchId, aliceExerciseId],
      );
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe("catalogue commun", () => {
    it("est lisible par les connectés, pas par les visiteurs", async () => {
      const connected = await asUser(client, bruno, async () =>
        (await one<{ n: number }>("select count(*)::int as n from public.exercises where user_id is null")).n,
      );
      const visitor = await asUser(client, null, async () => (await one<{ n: number }>("select count(*)::int as n from public.exercises")).n);
      expect(connected).toBeGreaterThanOrEqual(60);
      expect(visitor).toBe(0);
    });

    it("ne peut être ni modifié ni supprimé depuis l'app", async () => {
      const result = await asUser(client, alice, async () => {
        const updated = await client.query("update public.exercises set name = 'Pirate' where id = $1", [benchId]);
        const deleted = await client.query("delete from public.exercises where user_id is null");
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });

    it("refuse qu'un utilisateur ajoute un exercice au catalogue", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.exercises (user_id, name, primary_muscles) values (null, 'Faux', '{biceps}')"),
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  describe("cloisonnement", () => {
    const tables = ["exercises", "workout_templates", "template_items", "workouts", "workout_sets"] as const;

    it.each(tables)("Bruno ne voit aucune ligne d'Alice dans %s", async (table) => {
      const n = await asUser(client, bruno, async () =>
        (await one<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = $1`, [alice])).n,
      );
      expect(n).toBe(0);
    });

    it.each(tables)("Alice voit ses propres lignes de %s", async (table) => {
      const n = await asUser(client, alice, async () =>
        (await one<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = $1`, [alice])).n,
      );
      expect(n).toBeGreaterThan(0);
    });

    it.each(tables)("Bruno ne peut ni modifier ni supprimer les lignes d'Alice dans %s", async (table) => {
      const result = await asUser(client, bruno, async () => {
        const updated = await client.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]);
        const deleted = await client.query(`delete from public.${table} where user_id = $1`, [alice]);
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });
  });

  describe("cohérence entre tables", () => {
    it("Bruno ne peut pas ajouter une série dans la séance d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.workout_sets (workout_id, exercise_id, set_number, reps) values ($1, $2, 2, 10)", [
            aliceWorkoutId,
            benchId,
          ]),
        ),
      ).rejects.toThrow(/foreign key/);
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.workout_sets (user_id, workout_id, exercise_id, set_number, reps) values ($1, $2, $3, 2, 10)", [
            alice,
            aliceWorkoutId,
            benchId,
          ]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("Bruno ne peut pas utiliser l'exercice personnel d'Alice", async () => {
      await expect(
        asUser(client, bruno, async () => {
          const { id } = await one<{ id: string }>("insert into public.workouts (name, performed_on) values ('Test', '2026-11-08') returning id");
          await client.query("insert into public.workout_sets (workout_id, exercise_id, set_number, reps) values ($1, $2, 1, 10)", [
            id,
            aliceExerciseId,
          ]);
        }),
      ).rejects.toThrow(/row-level security/);
    });

    it("Bruno ne peut pas ajouter un exercice au modèle d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.template_items (template_id, exercise_id) values ($1, $2)", [aliceTemplateId, benchId]),
        ),
      ).rejects.toThrow(/foreign key/);
    });

    it("un exercice déjà utilisé ne peut pas être supprimé (il s'archive)", async () => {
      await expect(
        asUser(client, alice, () => client.query("delete from public.exercises where id = $1", [aliceExerciseId])),
      ).rejects.toThrow(/foreign key/);
    });

    it("supprimer une séance supprime ses séries", async () => {
      const left = await asUser(client, alice, async () => {
        await client.query("delete from public.workouts where id = $1", [aliceWorkoutId]);
        return (await one<{ n: number }>("select count(*)::int as n from public.workout_sets where workout_id = $1", [aliceWorkoutId])).n;
      });
      expect(left).toBe(0);
    });

    it("refuse une fourchette de répétitions inversée", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.template_items (template_id, exercise_id, rep_min, rep_max) values ($1, $2, 12, 8)", [
            aliceTemplateId,
            benchId,
          ]),
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });
});
