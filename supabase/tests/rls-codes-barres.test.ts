import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;
const CODE = "3017620422003";
const insert = "insert into public.foods (name, kcal, protein_g, carbs_g, fat_g, barcode) values ($1, 540, 6, 57, 31, $2)";

describe.skipIf(!adminUrl)("Codes-barres des aliments", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    await asUserCommit(client, alice, async () => {
      await client.query(insert, ["Pâte à tartiner", CODE]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("Alice n'a qu'un aliment actif par code-barres", async () => {
    await expect(asUser(client, alice, () => client.query(insert, ["Doublon", CODE]))).rejects.toThrow(/duplicate key/);
  });

  it("archiver l'ancien libère le code-barres", async () => {
    const n = await asUser(client, alice, async () => {
      await client.query("update public.foods set archived_at = now() where barcode = $1", [CODE]);
      await client.query(insert, ["Nouvelle recette du pot", CODE]);
      return (await client.query("select count(*)::int as n from public.foods where barcode = $1", [CODE])).rows[0].n;
    });
    expect(n).toBe(2);
  });

  it("Bruno enregistre le même produit chez lui sans voir celui d'Alice", async () => {
    const seen = await asUser(client, bruno, async () => {
      const before = (await client.query("select count(*)::int as n from public.foods where barcode = $1", [CODE])).rows[0].n;
      await client.query(insert, ["Pâte à tartiner", CODE]);
      return before;
    });
    expect(seen).toBe(0);
  });

  it("un code-barres ne contient que des chiffres", async () => {
    await expect(asUser(client, alice, () => client.query(insert, ["Bizarre", "ABC12345"]))).rejects.toThrow(/check constraint/);
  });
});
