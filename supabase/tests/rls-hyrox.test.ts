import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

const FULL = "array[300,280,310,190,315,330,320,290,325,300,330,150,335,340,340,420]";

describe.skipIf(!adminUrl)("RLS Hyrox", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  const insert = (sport: string, splits: string) =>
    client.query(
      `insert into public.activities (performed_on, sport, duration_minutes, duration_extra_s, intensity, hyrox_splits) values ('2026-11-14', '${sport}', 88, 20, 'intense', ${splits})`,
    );

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      await insert("hyrox", FULL);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("Alice lit ses temps, Bruno ne voit rien", async () => {
    const rows = (user: string) => asUser(client, user, async () => (await client.query("select hyrox_splits from public.activities where sport = 'hyrox'")).rows);
    const mine = await rows(alice);
    expect(mine).toHaveLength(1);
    expect(mine[0].hyrox_splits).toHaveLength(16);
    expect(mine[0].hyrox_splits[15]).toBe(420);
    expect(await rows(bruno)).toEqual([]);
  });

  it("Bruno ne peut pas corriger les temps d'Alice", async () => {
    const n = await asUser(client, bruno, async () => (await client.query("update public.activities set hyrox_splits = null where user_id = $1", [alice])).rowCount);
    expect(n).toBe(0);
  });

  it("accepte des temps manquants et une course sans temps", async () => {
    const n = await asUser(client, alice, async () => {
      await insert("hyrox", "array[300,null,310,null,null,null,null,null,null,null,null,null,null,null,null,null]::integer[]");
      await insert("hyrox", "null");
      return (await client.query("select count(*)::int as n from public.activities where sport = 'hyrox'")).rows[0].n;
    });
    expect(n).toBe(3);
  });

  it.each([
    ["quinze temps", "hyrox", "array[300,280,310,190,315,330,320,290,325,300,330,150,335,340,340]"],
    ["un temps nul", "hyrox", FULL.replace("420", "0")],
    ["un temps de plus de deux heures", "hyrox", FULL.replace("420", "7201")],
    ["un tableau à deux dimensions", "hyrox", "array[[300,280,310,190,315,330,320,290],[325,300,330,150,335,340,340,420]]"],
    ["des temps sur un autre sport", "course", FULL],
  ])("refuse %s", async (_, sport, splits) => {
    await expect(asUser(client, alice, () => insert(sport, splits))).rejects.toThrow(/check constraint/);
  });

  it("un ami ne reçoit pas les temps", async () => {
    const { rows } = await client.query(
      "select pg_get_function_result(p.oid) as result from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'friend_activities'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].result).not.toMatch(/hyrox/);
  });
});
