import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS stock et compléments", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let aliceSupplement: string;
  let brunoSupplement: string;
  let brunoFood: string;

  const rows = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    const rice = (await rows("select id from public.foods where slug = 'riz-blanc-cru'"))[0].id;

    await asUserCommit(client, alice, async () => {
      await client.query("insert into public.stock_items (name, quantity, aisle, food_id, grams, expires_on) values ('Riz blanc cru', '1 kg', 'feculents', $1, 1000, '2027-03-01')", [rice]);
      aliceSupplement = (await rows("insert into public.supplements (name, dose, moment) values ('Créatine', '5 g', 'matin') returning id"))[0].id;
      await client.query("insert into public.supplement_logs (supplement_id, taken_on) values ($1, '2026-11-07')", [aliceSupplement]);
    });
    await asUserCommit(client, bruno, async () => {
      brunoSupplement = (await rows("insert into public.supplements (name) values ('Vitamine D') returning id"))[0].id;
      brunoFood = (await rows("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Sauce de Bruno', 130, 3, 28, 0.5) returning id"))[0].id;
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe.each(["stock_items", "supplements", "supplement_logs"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno et un visiteur pas celles d'Alice", async () => {
      const count = (user: string | null) => asUser(client, user, async () => (await rows(`select count(*)::int as n from public.${table} where user_id = $1`, [alice]))[0].n);
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
    const refused = (sql: string, params: unknown[]) => expect(asUser(client, bruno, () => client.query(sql, params))).rejects.toThrow(/row-level security/);
    await refused("insert into public.stock_items (user_id, name) values ($1, 'Lait')", [alice]);
    await refused("insert into public.supplements (user_id, name) values ($1, 'Zinc')", [alice]);
    await refused("insert into public.supplement_logs (user_id, supplement_id, taken_on) values ($1, $2, '2026-11-08')", [alice, aliceSupplement]);
  });

  it("on ne coche que ses propres compléments", async () => {
    await expect(asUser(client, bruno, () => client.query("insert into public.supplement_logs (supplement_id, taken_on) values ($1, '2026-11-08')", [aliceSupplement]))).rejects.toThrow(
      /foreign key/,
    );
    await asUser(client, bruno, () => client.query("insert into public.supplement_logs (supplement_id, taken_on) values ($1, '2026-11-08')", [brunoSupplement]));
  });

  it("une prise par complément et par jour", async () => {
    await expect(asUser(client, alice, () => client.query("insert into public.supplement_logs (supplement_id, taken_on) values ($1, '2026-11-07')", [aliceSupplement]))).rejects.toThrow(
      /duplicate key/,
    );
  });

  it("un article du stock ne vise que le catalogue ou ses propres aliments", async () => {
    await expect(asUser(client, alice, () => client.query("insert into public.stock_items (name, food_id) values ('Sauce', $1)", [brunoFood]))).rejects.toThrow(/row-level security/);
    await expect(asUser(client, alice, () => client.query("update public.stock_items set food_id = $1", [brunoFood]))).rejects.toThrow(/row-level security/);
  });

  it("refuse les valeurs hors limites", async () => {
    const bad = (sql: string) => expect(asUser(client, alice, () => client.query(sql))).rejects.toThrow(/check constraint|invalid input value/);
    await bad("insert into public.stock_items (name) values ('')");
    await bad("insert into public.stock_items (name, grams) values ('Riz', 0)");
    await bad("insert into public.supplements (name) values ('')");
    await bad("insert into public.supplements (name, dose) values ('Zinc', '')");
    await bad("insert into public.supplements (name, moment) values ('Zinc', 'minuit')");
  });

  it("supprimer un complément retire ses prises", async () => {
    const left = await asUser(client, alice, async () => {
      await client.query("delete from public.supplements where id = $1", [aliceSupplement]);
      return (await rows("select count(*)::int as n from public.supplement_logs"))[0].n;
    });
    expect(left).toBe(0);
  });
});
