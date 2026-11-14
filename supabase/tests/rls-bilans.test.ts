import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS bilans", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  const rows = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      await client.query("insert into public.weekly_reviews (week_start, feeling, note) values ('2026-11-02', 4, 'Bonne semaine')");
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("Alice voit son bilan, Bruno et un visiteur non", async () => {
    const count = (user: string | null) => asUser(client, user, async () => (await rows("select count(*)::int as n from public.weekly_reviews"))[0].n);
    expect(await count(alice)).toBe(1);
    expect(await count(bruno)).toBe(0);
    expect(await count(null)).toBe(0);
  });

  it("Bruno ne peut ni modifier ni supprimer le bilan d'Alice, ni écrire à sa place", async () => {
    const result = await asUser(client, bruno, async () => {
      const updated = await client.query("update public.weekly_reviews set feeling = 1 where user_id = $1", [alice]);
      const deleted = await client.query("delete from public.weekly_reviews where user_id = $1", [alice]);
      return { updated: updated.rowCount, deleted: deleted.rowCount };
    });
    expect(result).toEqual({ updated: 0, deleted: 0 });
    await expect(asUser(client, bruno, () => client.query("insert into public.weekly_reviews (user_id, week_start, feeling) values ($1, '2026-11-09', 3)", [alice]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("un bilan par semaine, qui se met à jour", async () => {
    const feeling = await asUser(client, alice, async () => {
      await client.query(
        "insert into public.weekly_reviews (week_start, feeling) values ('2026-11-02', 2) on conflict (user_id, week_start) do update set feeling = excluded.feeling, note = excluded.note",
      );
      return (await rows("select feeling, note from public.weekly_reviews"))[0];
    });
    expect(feeling).toEqual({ feeling: 2, note: null });
  });

  it("refuse une semaine qui ne commence pas un lundi et les valeurs hors limites", async () => {
    const bad = (sql: string) => expect(asUser(client, alice, () => client.query(sql))).rejects.toThrow(/check constraint/);
    await bad("insert into public.weekly_reviews (week_start, feeling) values ('2026-11-10', 3)");
    await bad("insert into public.weekly_reviews (week_start, feeling) values ('2026-11-09', 0)");
    await bad("insert into public.weekly_reviews (week_start, feeling) values ('2026-11-09', 6)");
    await bad("insert into public.weekly_reviews (week_start, feeling, note) values ('2026-11-09', 3, '')");
  });
});
