import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS endurance", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  const insert = (values: string) =>
    client.query(`insert into public.activities (performed_on, sport, duration_minutes, intensity, distance_m, duration_extra_s, elevation_m, avg_hr) values ${values}`);

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      await insert("('2026-11-10', 'course', 47, 'moderee', 10000, 30, 85, 158)");
      await insert("('2026-11-12', 'natation', 40, 'legere', 1500, 0, null, null)");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("Alice lit ses sorties avec leur distance, Bruno n'en voit aucune", async () => {
    const rows = (user: string) =>
      asUser(client, user, async () => (await client.query("select sport::text, distance_m, duration_extra_s from public.activities order by performed_on")).rows);
    expect(await rows(alice)).toEqual([
      { sport: "course", distance_m: 10000, duration_extra_s: 30 },
      { sport: "natation", distance_m: 1500, duration_extra_s: 0 },
    ]);
    expect(await rows(bruno)).toEqual([]);
  });

  it("Bruno ne peut pas corriger la distance d'Alice", async () => {
    const n = await asUser(client, bruno, async () => (await client.query("update public.activities set distance_m = 42195 where user_id = $1", [alice])).rowCount);
    expect(n).toBe(0);
  });

  it.each([
    ["une distance nulle", "('2026-11-13', 'course', 30, 'moderee', 0, 0, null, null)"],
    ["plus de 59 secondes en plus", "('2026-11-13', 'course', 30, 'moderee', 5000, 60, null, null)"],
    ["un dénivelé négatif", "('2026-11-13', 'trail', 30, 'moderee', 5000, 0, -10, null)"],
    ["une fréquence cardiaque impossible", "('2026-11-13', 'velo', 30, 'moderee', 5000, 0, null, 300)"],
  ])("refuse %s", async (_, values) => {
    await expect(asUser(client, alice, () => insert(values))).rejects.toThrow(/check constraint/);
  });

  it("une activité sans distance reste valable", async () => {
    const n = await asUser(client, alice, async () => {
      await client.query("insert into public.activities (performed_on, sport, duration_minutes, intensity) values ('2026-11-13', 'rameur', 20, 'intense')");
      return (await client.query("select count(*)::int as n from public.activities where sport = 'rameur' and distance_m is null and duration_extra_s = 0")).rows[0].n;
    });
    expect(n).toBe(1);
  });

  it("un ami ne reçoit ni distance, ni dénivelé, ni fréquence cardiaque", async () => {
    const { rows } = await client.query(
      "select pg_get_function_result(p.oid) as result from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'friend_activities'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].result).not.toMatch(/distance|elevation|avg_hr/);
  });
});
