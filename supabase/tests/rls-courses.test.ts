import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS courses", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let catalogFood: string;
  let aliceFood: string;
  let brunoFood: string;

  const rows = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;
  const food = async (name: string) => (await rows("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ($1, 130, 3, 28, 0.5) returning id", [name]))[0].id as string;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    catalogFood = (await rows("select id from public.foods where slug = 'riz-blanc-cru'"))[0].id;

    await asUserCommit(client, alice, async () => {
      aliceFood = await food("Granola maison");
      await client.query("insert into public.shopping_items (name, quantity, aisle, food_id, grams) values ('Riz blanc cru', '1 kg', 'feculents', $1, 1000)", [catalogFood]);
      await client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 2.4)", [catalogFood]);
      await client.query("insert into public.purchases (purchased_on, amount, store) values ('2026-11-07', 47.3, 'Marché')");
      await client.query("update public.profiles set weekly_food_budget = 50");
    });
    await asUserCommit(client, bruno, async () => {
      brunoFood = await food("Sauce de Bruno");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["shopping_items", "food_prices", "purchases"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno et un visiteur aucune", async () => {
      const count = (user: string | null) => asUser(client, user, async () => (await rows(`select count(*)::int as n from public.${table}`))[0].n);
      expect(await count(alice)).toBe(1);
      expect(await count(bruno)).toBe(0);
      expect(await count(null)).toBe(0);
    });

    it("Bruno ne peut ni modifier ni supprimer les lignes d'Alice", async () => {
      const result = await asUser(client, bruno, async () => {
        const updated = await client.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]);
        const deleted = await client.query(`delete from public.${table} where user_id = $1`, [alice]);
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });
  });

  it("Bruno n'écrit rien au nom d'Alice", async () => {
    await expect(asUser(client, bruno, () => client.query("insert into public.shopping_items (user_id, name) values ($1, 'Lait')", [alice]))).rejects.toThrow(/row-level security/);
    await expect(asUser(client, bruno, () => client.query("insert into public.food_prices (user_id, food_id, price_per_kg) values ($1, $2, 1)", [alice, brunoFood]))).rejects.toThrow(
      /row-level security/,
    );
    await expect(asUser(client, bruno, () => client.query("insert into public.purchases (user_id, purchased_on, amount) values ($1, '2026-11-07', 10)", [alice]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("un article ou un prix ne vise que le catalogue ou ses propres aliments", async () => {
    await asUser(client, alice, async () => {
      await client.query("insert into public.shopping_items (name, food_id) values ('Granola maison', $1)", [aliceFood]);
      await client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 8)", [aliceFood]);
    });
    await expect(asUser(client, alice, () => client.query("insert into public.shopping_items (name, food_id) values ('Sauce', $1)", [brunoFood]))).rejects.toThrow(/row-level security/);
    await expect(asUser(client, alice, () => client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 3)", [brunoFood]))).rejects.toThrow(/row-level security/);
    await expect(asUser(client, alice, () => client.query("update public.shopping_items set food_id = $1", [brunoFood]))).rejects.toThrow(/row-level security/);
  });

  it("refuse les valeurs hors limites", async () => {
    const bad = (sql: string) => expect(asUser(client, alice, () => client.query(sql))).rejects.toThrow(/check constraint/);
    await bad("insert into public.shopping_items (name) values ('')");
    await bad("insert into public.shopping_items (name, grams) values ('Riz', 0)");
    await bad("insert into public.purchases (purchased_on, amount) values ('2026-11-07', 0)");
    await bad("insert into public.purchases (purchased_on, amount) values ('2026-11-07', 6000)");
    await bad("update public.profiles set weekly_food_budget = 0");
    await expect(asUser(client, alice, () => client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 0)", [aliceFood]))).rejects.toThrow(/check constraint/);
  });

  it("le prix d'un aliment se met à jour au lieu de se dupliquer", async () => {
    const price = await asUser(client, alice, async () => {
      await client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 2.9) on conflict (user_id, food_id) do update set price_per_kg = excluded.price_per_kg", [catalogFood]);
      return (await rows("select price_per_kg from public.food_prices")).map((r) => r.price_per_kg);
    });
    expect(price).toEqual(["2.90"]);
  });

  it("supprimer un aliment garde l'article de la liste et retire son prix", async () => {
    const result = await asUser(client, alice, async () => {
      await client.query("insert into public.shopping_items (name, food_id) values ('Granola maison', $1)", [aliceFood]);
      await client.query("insert into public.food_prices (food_id, price_per_kg) values ($1, 8)", [aliceFood]);
      await client.query("delete from public.foods where id = $1", [aliceFood]);
      return {
        item: (await rows("select food_id from public.shopping_items where name = 'Granola maison'"))[0],
        prices: (await rows("select count(*)::int as n from public.food_prices where food_id = $1", [aliceFood]))[0].n,
      };
    });
    expect(result).toEqual({ item: { food_id: null }, prices: 0 });
  });

  it("pas de budget par défaut", async () => {
    const budget = await asUser(client, bruno, async () => (await rows("select weekly_food_budget from public.profiles"))[0].weekly_food_budget);
    expect(budget).toBeNull();
  });
});
