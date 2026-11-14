import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS objectifs de course et zones", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  const insert = (values: string) => client.query(`insert into public.race_plans (name, race_on, distance_m, target_seconds) values ${values}`);

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      await insert("('Semi de Paris', '2027-03-07', 21097, 6300)");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("la RLS est active avec quatre politiques", async () => {
    const { rows } = await client.query(
      "select c.relrowsecurity as rls, (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = 'race_plans') as policies from pg_class c where c.oid = 'public.race_plans'::regclass",
    );
    expect(rows[0]).toEqual({ rls: true, policies: 4 });
  });

  it("Alice lit son objectif, Bruno ne voit rien", async () => {
    const names = (user: string) => asUser(client, user, async () => (await client.query("select name from public.race_plans")).rows.map((r) => r.name));
    expect(await names(alice)).toEqual(["Semi de Paris"]);
    expect(await names(bruno)).toEqual([]);
  });

  it("Bruno ne peut ni corriger ni supprimer l'objectif d'Alice", async () => {
    const counts = await asUser(client, bruno, async () => [
      (await client.query("update public.race_plans set target_seconds = 6000 where user_id = $1", [alice])).rowCount,
      (await client.query("delete from public.race_plans where user_id = $1", [alice])).rowCount,
    ]);
    expect(counts).toEqual([0, 0]);
  });

  it("Bruno ne peut pas créer un objectif au nom d'Alice", async () => {
    await expect(
      asUser(client, bruno, () => client.query("insert into public.race_plans (user_id, name, race_on, distance_m) values ($1, 'Intrus', '2027-01-01', 10000)", [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("un objectif sans temps visé est valable", async () => {
    const n = await asUser(client, alice, async () => {
      await insert("('10 km du quartier', '2027-01-17', 10000, null)");
      return (await client.query("select count(*)::int as n from public.race_plans")).rows[0].n;
    });
    expect(n).toBe(2);
  });

  it.each([
    ["un nom vide", "('', '2027-03-07', 21097, 6300)"],
    ["une distance de moins de 1 km", "('Sprint', '2027-03-07', 400, 80)"],
    ["un temps visé de quelques secondes", "('Semi', '2027-03-07', 21097, 60)"],
  ])("refuse %s", async (_, values) => {
    await expect(asUser(client, alice, () => insert(values))).rejects.toThrow(/check constraint/);
  });

  it("l'objectif part avec le compte", async () => {
    await client.query("begin");
    await client.query("delete from auth.users where id = $1", [alice]);
    const { rows } = await client.query("select count(*)::int as n from public.race_plans");
    await client.query("rollback");
    expect(rows[0].n).toBe(0);
  });

  it("chacun note ses fréquences cardiaques, bornées, sur son seul profil", async () => {
    const mine = await asUser(client, alice, async () => {
      await client.query("update public.profiles set hr_max = 188, hr_rest = 52 where user_id = $1", [alice]);
      return (await client.query("select hr_max, hr_rest from public.profiles where user_id = $1", [alice])).rows[0];
    });
    expect(mine).toEqual({ hr_max: 188, hr_rest: 52 });
    const others = await asUser(client, bruno, async () => (await client.query("update public.profiles set hr_max = 150 where user_id = $1", [alice])).rowCount);
    expect(others).toBe(0);
    const set = (sql: string) => asUser(client, alice, () => client.query(`update public.profiles set ${sql} where user_id = $1`, [alice]));
    await expect(set("hr_max = 300")).rejects.toThrow(/check constraint/);
    await expect(set("hr_rest = 10")).rejects.toThrow(/check constraint/);
    await expect(set("hr_max = 110, hr_rest = 115")).rejects.toThrow(/check constraint/);
  });

  it("aucune fonction d'ami ne renvoie les objectifs ni les fréquences", async () => {
    const { rows } = await client.query(
      "select p.proname, pg_get_function_result(p.oid) as result, p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'friend%'",
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(`${r.result} ${r.prosrc}`).not.toMatch(/race_plans|hr_max|hr_rest/);
  });
});
