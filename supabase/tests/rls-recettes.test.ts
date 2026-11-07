import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS recettes", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let riceId: string;
  let aliceFoodId: string;
  let recipeId: string;

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
    riceId = (await one<{ id: string }>("select id from public.foods where user_id is null order by name limit 1")).id;

    await asUserCommit(client, alice, async () => {
      aliceFoodId = (await one<{ id: string }>("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Sauce maison', 120, 2, 8, 9) returning id")).id;
      recipeId = (
        await one<{ id: string }>(
          "insert into public.foods (name, kcal, protein_g, carbs_g, fat_g, is_recipe, recipe_portions, portion_g, portion_label) values ('Poulet curry', 150, 14, 15, 4, true, 4, 400, '1 part') returning id",
        )
      ).id;
      await client.query("insert into public.recipe_items (recipe_id, food_id, grams) values ($1, $2, 500), ($1, $3, 100)", [recipeId, riceId, aliceFoodId]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("Alice voit ses ingrédients, Bruno aucun", async () => {
    const count = (user: string) =>
      asUser(client, user, async () => (await client.query("select count(*)::int as n from public.recipe_items where user_id = $1", [alice])).rows[0].n);
    expect(await count(alice)).toBe(2);
    expect(await count(bruno)).toBe(0);
  });

  it("Bruno ne peut ni modifier ni supprimer les ingrédients d'Alice", async () => {
    const result = await asUser(client, bruno, async () => {
      const updated = await client.query("update public.recipe_items set grams = 1 where user_id = $1", [alice]);
      const deleted = await client.query("delete from public.recipe_items where user_id = $1", [alice]);
      return { updated: updated.rowCount, deleted: deleted.rowCount };
    });
    expect(result).toEqual({ updated: 0, deleted: 0 });
  });

  it("un visiteur ne voit rien", async () => {
    const n = await asUser(client, null, async () => (await client.query("select count(*)::int as n from public.recipe_items")).rows[0].n);
    expect(n).toBe(0);
  });

  it("Bruno ne peut pas ajouter un ingrédient à la recette d'Alice", async () => {
    await expect(
      asUser(client, bruno, () => client.query("insert into public.recipe_items (recipe_id, food_id, grams) values ($1, $2, 100)", [recipeId, riceId])),
    ).rejects.toThrow(/foreign key/);
  });

  it("Bruno ne peut pas utiliser l'aliment personnel d'Alice comme ingrédient", async () => {
    await expect(
      asUser(client, bruno, async () => {
        const mine = (await one<{ id: string }>("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g, is_recipe) values ('Pâtes', 140, 5, 28, 1, true) returning id")).id;
        await client.query("insert into public.recipe_items (recipe_id, food_id, grams) values ($1, $2, 100)", [mine, aliceFoodId]);
      }),
    ).rejects.toThrow(/row-level security/);
  });

  it("une recette n'est pas son propre ingrédient", async () => {
    await expect(
      asUser(client, alice, () => client.query("insert into public.recipe_items (recipe_id, food_id, grams) values ($1, $1, 100)", [recipeId])),
    ).rejects.toThrow(/check constraint/);
  });

  it("un aliment simple n'a ni poids cuit ni parts", async () => {
    await expect(
      asUser(client, alice, () => client.query("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g, recipe_portions) values ('Bizarre', 100, 1, 1, 1, 2)")),
    ).rejects.toThrow(/check constraint/);
  });

  it("supprimer la recette supprime ses ingrédients, pas les aliments", async () => {
    const left = await asUser(client, alice, async () => {
      await client.query("delete from public.foods where id = $1", [recipeId]);
      const items = (await client.query("select count(*)::int as n from public.recipe_items")).rows[0].n;
      const food = (await client.query("select count(*)::int as n from public.foods where id = $1", [aliceFoodId])).rows[0].n;
      return { items, food };
    });
    expect(left).toEqual({ items: 0, food: 1 });
  });
});
