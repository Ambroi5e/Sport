import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS nutrition", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let oatsId: string;
  let aliceFoodId: string;
  let aliceMealId: string;

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
    oatsId = (await one<{ id: string }>("select id from public.foods where slug = 'flocons-avoine'")).id;

    await asUserCommit(client, alice, async () => {
      aliceFoodId = (
        await one<{ id: string }>(
          "insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Granola maison', 450, 12, 55, 18) returning id",
        )
      ).id;
      await client.query("insert into public.food_logs (food_id, eaten_on, meal, grams) values ($1, '2026-11-09', 'petit_dejeuner', 80), ($2, '2026-11-09', 'petit_dejeuner', 60)", [
        oatsId,
        aliceFoodId,
      ]);
      await client.query("insert into public.nutrition_targets (day_type, kcal, protein_g) values ('entrainement', 2600, 140), ('repos', 2400, 140)");
      aliceMealId = (await one<{ id: string }>("insert into public.saved_meals (name, meal) values ('Petit-déj', 'petit_dejeuner') returning id")).id;
      await client.query("insert into public.saved_meal_items (saved_meal_id, food_id, grams) values ($1, $2, 80)", [aliceMealId, oatsId]);
      await client.query("update public.profiles set training_days = '{1,3,5}' where user_id = $1", [alice]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe("catalogue commun", () => {
    it("est lisible par les connectés, pas par les visiteurs", async () => {
      const connected = await asUser(client, bruno, async () =>
        (await one<{ n: number }>("select count(*)::int as n from public.foods where user_id is null")).n,
      );
      const visitor = await asUser(client, null, async () => (await one<{ n: number }>("select count(*)::int as n from public.foods")).n);
      expect(connected).toBeGreaterThanOrEqual(80);
      expect(visitor).toBe(0);
    });

    it("ne peut être ni modifié, ni supprimé, ni complété depuis l'app", async () => {
      const result = await asUser(client, alice, async () => {
        const updated = await client.query("update public.foods set kcal = 1 where id = $1", [oatsId]);
        const deleted = await client.query("delete from public.foods where user_id is null");
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.foods (user_id, name, kcal, protein_g, carbs_g, fat_g) values (null, 'Faux', 1, 0, 0, 0)"),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("refuse des valeurs impossibles pour 100 g", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Trop', 400, 60, 50, 10)"),
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("cloisonnement", () => {
    const tables = ["foods", "food_logs", "nutrition_targets", "saved_meals", "saved_meal_items"] as const;

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

    it("Bruno ne lit pas les jours d'entraînement d'Alice", async () => {
      const rows = await asUser(client, bruno, async () => (await client.query("select training_days from public.profiles where user_id = $1", [alice])).rows);
      expect(rows).toEqual([]);
    });
  });

  describe("cohérence entre tables", () => {
    it("Bruno ne peut pas noter l'aliment personnel d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.food_logs (food_id, eaten_on, meal, grams) values ($1, '2026-11-09', 'diner', 100)", [aliceFoodId]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("Bruno peut noter un aliment du catalogue", async () => {
      const n = await asUser(client, bruno, async () => {
        await client.query("insert into public.food_logs (food_id, eaten_on, meal, grams) values ($1, '2026-11-09', 'diner', 100)", [oatsId]);
        return (await one<{ n: number }>("select count(*)::int as n from public.food_logs")).n;
      });
      expect(n).toBe(1);
    });

    it("Bruno ne peut pas remplir le repas favori d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.saved_meal_items (saved_meal_id, food_id, grams) values ($1, $2, 50)", [aliceMealId, oatsId]),
        ),
      ).rejects.toThrow(/foreign key/);
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.saved_meal_items (user_id, saved_meal_id, food_id, grams) values ($1, $2, $3, 50)", [alice, aliceMealId, oatsId]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("un aliment personnel déjà noté ne peut pas être supprimé, seulement archivé", async () => {
      await expect(asUser(client, alice, () => client.query("delete from public.foods where id = $1", [aliceFoodId]))).rejects.toThrow(/foreign key/);
      const archived = await asUser(client, alice, async () => (await client.query("update public.foods set archived_at = now() where id = $1", [aliceFoodId])).rowCount);
      expect(archived).toBe(1);
    });

    it("les cibles se mettent à jour par upsert, comme le fait la page Cibles", async () => {
      const rows = await asUser(client, alice, async () => {
        await client.query(
          "insert into public.nutrition_targets (user_id, day_type, kcal, protein_g) values ($1, 'entrainement', 3600, 190), ($1, 'repos', 3400, 190) on conflict (user_id, day_type) do update set kcal = excluded.kcal, protein_g = excluded.protein_g",
          [alice],
        );
        return (await client.query("select day_type, kcal, protein_g from public.nutrition_targets order by day_type")).rows;
      });
      expect(rows).toEqual([
        { day_type: "entrainement", kcal: 3600, protein_g: 190 },
        { day_type: "repos", kcal: 3400, protein_g: 190 },
      ]);
    });

    it("Bruno ne peut pas écraser les cibles d'Alice par upsert", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query(
            "insert into public.nutrition_targets (user_id, day_type, kcal, protein_g) values ($1, 'repos', 900, 10) on conflict (user_id, day_type) do update set kcal = excluded.kcal",
            [alice],
          ),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("refuse un jour de la semaine hors de 1 à 7", async () => {
      await expect(
        asUser(client, alice, () => client.query("update public.profiles set training_days = '{0,8}' where user_id = $1", [alice])),
      ).rejects.toThrow(/check constraint/);
    });
  });
});
