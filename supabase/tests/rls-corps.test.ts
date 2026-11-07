import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS corps et photos", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  const photoId = "11111111-1111-4111-8111-111111111111";

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");

    await asUserCommit(client, alice, async () => {
      await client.query(
        "insert into public.body_measurements (measured_on, site, value_cm) values ('2026-11-01', 'bras', 38.5), ('2026-11-01', 'taille', 82)",
      );
      await client.query("insert into storage.objects (bucket_id, name) values ('progress-photos', $1)", [`${alice}/${photoId}.jpg`]);
      await client.query("insert into public.progress_photos (id, taken_on, pose, storage_path) values ($1, '2026-11-01', 'face', $2)", [
        photoId,
        `${alice}/${photoId}.jpg`,
      ]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("le bucket des photos est privé et n'accepte que des JPEG d'1 Mo au plus", async () => {
    const { rows } = await client.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'progress-photos'");
    expect(rows).toEqual([{ public: false, file_size_limit: "1048576", allowed_mime_types: ["image/jpeg"] }]);
  });

  describe.each(["body_measurements", "progress_photos"])("%s", (table) => {
    it("Alice voit ses lignes, Bruno aucune", async () => {
      const count = (user: string) =>
        asUser(client, user, async () => (await client.query(`select count(*)::int as n from public.${table} where user_id = $1`, [alice])).rows[0].n);
      expect(await count(alice)).toBeGreaterThan(0);
      expect(await count(bruno)).toBe(0);
    });

    it("Bruno ne peut ni modifier ni supprimer les lignes d'Alice", async () => {
      const result = await asUser(client, bruno, async () => {
        const updated = await client.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]);
        const deleted = await client.query(`delete from public.${table} where user_id = $1`, [alice]);
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });

    it("un visiteur ne voit rien", async () => {
      const n = await asUser(client, null, async () => (await client.query(`select count(*)::int as n from public.${table}`)).rows[0].n);
      expect(n).toBe(0);
    });
  });

  describe("mensurations", () => {
    it("une seule valeur par zone et par jour", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.body_measurements (measured_on, site, value_cm) values ('2026-11-01', 'bras', 39)")),
      ).rejects.toThrow(/duplicate key/);
    });

    it("refuse une valeur impossible", async () => {
      await expect(
        asUser(client, alice, () => client.query("insert into public.body_measurements (measured_on, site, value_cm) values ('2026-11-02', 'bras', 400)")),
      ).rejects.toThrow(/check constraint/);
    });
  });

  describe("photos", () => {
    it("Bruno ne lit pas le fichier d'Alice", async () => {
      const n = await asUser(client, bruno, async () => (await client.query("select count(*)::int as n from storage.objects where bucket_id = 'progress-photos'")).rows[0].n);
      expect(n).toBe(0);
    });

    it("Bruno ne peut pas déposer un fichier dans le dossier d'Alice", async () => {
      await expect(
        asUser(client, bruno, () => client.query("insert into storage.objects (bucket_id, name) values ('progress-photos', $1)", [`${alice}/intrus.jpg`])),
      ).rejects.toThrow(/row-level security/);
    });

    it("Bruno ne peut pas supprimer le fichier d'Alice", async () => {
      const deleted = await asUser(client, bruno, async () => (await client.query("delete from storage.objects where bucket_id = 'progress-photos'")).rowCount);
      expect(deleted).toBe(0);
    });

    it("Bruno dépose dans son propre dossier", async () => {
      const n = await asUser(client, bruno, async () => {
        await client.query("insert into storage.objects (bucket_id, name) values ('progress-photos', $1)", [`${bruno}/a.jpg`]);
        return (await client.query("select count(*)::int as n from storage.objects")).rows[0].n;
      });
      expect(n).toBe(1);
    });

    it("une photo ne peut pas pointer vers le dossier d'un autre", async () => {
      const id = "22222222-2222-4222-8222-222222222222";
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.progress_photos (id, taken_on, pose, storage_path) values ($1, '2026-11-02', 'face', $2)", [id, `${alice}/${id}.jpg`]),
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });
});
