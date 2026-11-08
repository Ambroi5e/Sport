import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

/** Tables de public qui portent un user_id, pour compter tout ce qui appartient à quelqu'un. */
async function ownedRows(client: Client, userId: string): Promise<number> {
  const { rows: tables } = await client.query<{ table_name: string }>(
    "select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id'",
  );
  let total = 0;
  for (const { table_name } of tables) {
    const { rows } = await client.query<{ n: number }>(`select count(*)::int as n from public.${table_name} where user_id = $1`, [userId]);
    total += rows[0].n;
  }
  return total;
}

describe.skipIf(!adminUrl)("Suppression du compte", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  async function fill(userId: string) {
    await asUserCommit(client, userId, async () => {
      await client.query("insert into public.body_weights (measured_on, weight_kg) values ('2026-11-01', 80.4)");
      await client.query("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Granola maison', 450, 12, 60, 18)");
      const { rows } = await client.query<{ id: string }>("insert into public.workouts (performed_on, name) values ('2026-11-02', 'Haut') returning id");
      const { rows: ex } = await client.query<{ id: string }>("insert into public.exercises (name, primary_muscles) values ('Curl perso', '{biceps}') returning id");
      await client.query("insert into public.workout_sets (workout_id, exercise_id, exercise_order, set_number, reps, weight_kg) values ($1, $2, 1, 1, 10, 14)", [
        rows[0].id,
        ex[0].id,
      ]);
    });
  }

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await fill(alice);
    await fill(bruno);
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("refuse sans session", async () => {
    await expect(asUser(client, null, () => client.query("select public.delete_my_account()"))).rejects.toThrow(/not_authenticated/);
  });

  it("refuse tant qu'une photo reste dans le dossier de la personne", async () => {
    await client.query("insert into storage.objects (bucket_id, name) values ('progress-photos', $1)", [`${alice}/oubliee.jpg`]);
    await expect(asUser(client, alice, () => client.query("select public.delete_my_account()"))).rejects.toThrow(/photos_remaining/);
    const { rows } = await client.query("select count(*)::int as n from auth.users where id = $1", [alice]);
    expect(rows[0].n).toBe(1);
    await client.query("delete from storage.objects where name = $1", [`${alice}/oubliee.jpg`]);
  });

  it("une photo dans le dossier d'un autre ne bloque pas", async () => {
    await client.query("insert into storage.objects (bucket_id, name) values ('progress-photos', $1)", [`${bruno}/a.jpg`]);
    const remaining = await asUser(client, alice, async () => {
      await client.query("select public.delete_my_account()");
      // Compter en administrateur, dans la même transaction (annulée ensuite).
      await client.query("reset role");
      return (await client.query("select count(*)::int as n from auth.users")).rows[0].n;
    });
    expect(remaining).toBe(1);
    await client.query("delete from storage.objects where name = $1", [`${bruno}/a.jpg`]);
  });

  it("efface le compte et toutes ses lignes, sans toucher à celles des autres", async () => {
    expect(await ownedRows(client, alice)).toBeGreaterThan(5);
    const brunoBefore = await ownedRows(client, bruno);

    await asUserCommit(client, alice, async () => {
      await client.query("select public.delete_my_account()");
    });

    const { rows } = await client.query("select count(*)::int as n from auth.users where id = $1", [alice]);
    expect(rows[0].n).toBe(0);
    expect(await ownedRows(client, alice)).toBe(0);
    expect(await ownedRows(client, bruno)).toBe(brunoBefore);
  });

  it("l'invitation utilisée reste, sans lien vers le compte supprimé", async () => {
    const { rows } = await client.query("select used_by, used_at is not null as used from public.invitations order by used_at");
    expect(rows).toEqual([
      { used_by: null, used: true },
      { used_by: bruno, used: true },
    ]);
  });
});
