import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

// Les tests RLS demandent un Postgres (local ou service CI). Sans lui, ils sont sautés.
describe.skipIf(!adminUrl)("RLS et inscription", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    await seedInvitation(client, "FONTE-AAAA-1111");
    await seedInvitation(client, "FONTE-BBBB-2222");
    alice = await signUp(client, "alice@example.test", "fonte-aaaa-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTEBBBB2222");
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe("schéma", () => {
    it("active la RLS sur chaque table du schéma public", async () => {
      const { rows } = await client.query<{ relname: string }>(`
        select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
      expect(rows.map((r) => r.relname)).toEqual([]);
    });

    it("donne au moins une politique à chaque table du schéma public", async () => {
      const { rows } = await client.query<{ relname: string }>(`
        select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)`);
      expect(rows.map((r) => r.relname)).toEqual([]);
    });
  });

  describe("inscription sur invitation", () => {
    it("crée le profil à l'inscription et consomme le code", async () => {
      const { rows } = await client.query("select user_id from public.profiles order by user_id");
      expect(rows.map((r) => r.user_id).sort()).toEqual([alice, bruno].sort());
      const used = await client.query("select count(*)::int as n from public.invitations where used_by is not null");
      expect(used.rows[0].n).toBe(2);
    });

    it("refuse une inscription sans code", async () => {
      await expect(signUp(client, "intrus@example.test")).rejects.toThrow(/invitation_invalid/);
    });

    it("refuse un code inconnu", async () => {
      await expect(signUp(client, "intrus@example.test", "FONTE-ZZZZ-9999")).rejects.toThrow(/invitation_invalid/);
    });

    it("refuse un code déjà utilisé", async () => {
      await expect(signUp(client, "intrus@example.test", "FONTE-AAAA-1111")).rejects.toThrow(/invitation_invalid/);
    });

    it("refuse un code expiré", async () => {
      await seedInvitation(client, "FONTE-OLD0-0000", -1);
      await expect(signUp(client, "intrus@example.test", "FONTE-OLD0-0000")).rejects.toThrow(/invitation_invalid/);
    });
  });

  describe("inscription avec Google (invitation réservée)", () => {
    const reserve = (code: string, email: string) =>
      asUser(client, null, async () => {
        const { rows } = await client.query<{ ok: boolean }>("select public.reserve_invitation($1, $2) as ok", [code, email]);
        return rows[0].ok;
      });

    /** Réservation hors transaction annulée, comme l'appel réel depuis la page d'inscription. */
    const reserveForReal = async (code: string, email: string) => {
      await client.query("set role anon");
      try {
        const { rows } = await client.query<{ ok: boolean }>("select public.reserve_invitation($1, $2) as ok", [code, email]);
        return rows[0].ok;
      } finally {
        await client.query("reset role");
      }
    };

    it("un visiteur réserve un code valable, pas un code inconnu, utilisé ou mal formé", async () => {
      await seedInvitation(client, "FONTE-GGGG-0001");
      expect(await reserve("fonte-gggg-0001", "Chloe@Example.test")).toBe(true);
      expect(await reserve("FONTE-ZZZZ-9999", "chloe@example.test")).toBe(false);
      expect(await reserve("FONTE-AAAA-1111", "chloe@example.test")).toBe(false);
      expect(await reserve("FONTE-GGGG-0001", "pas-une-adresse")).toBe(false);
    });

    it("crée le compte Google dont l'adresse correspond à la réservation, une seule fois", async () => {
      await seedInvitation(client, "FONTE-GGGG-0002");
      expect(await reserveForReal("FONTE-GGGG-0002", "Chloe@Example.test")).toBe(true);

      const chloe = await signUp(client, "chloe@example.test");
      const { rows } = await client.query("select used_by from public.invitations where used_by = $1", [chloe]);
      expect(rows).toHaveLength(1);
      expect(await reserveForReal("FONTE-GGGG-0002", "autre@example.test")).toBe(false);
    });

    it("refuse un compte Google d'une autre adresse que celle réservée", async () => {
      await seedInvitation(client, "FONTE-GGGG-0003");
      expect(await reserveForReal("FONTE-GGGG-0003", "denis@example.test")).toBe(true);
      await expect(signUp(client, "intrus@example.test")).rejects.toThrow(/invitation_invalid/);
    });

    it("refuse une réservation expirée", async () => {
      await seedInvitation(client, "FONTE-GGGG-0004");
      expect(await reserveForReal("FONTE-GGGG-0004", "emma@example.test")).toBe(true);
      await client.query("update public.invitations set reserved_until = now() - interval '1 minute' where reserved_email = 'emma@example.test'");
      await expect(signUp(client, "emma@example.test")).rejects.toThrow(/invitation_invalid/);
    });

    it("un visiteur ne lit toujours pas les invitations ni les adresses réservées", async () => {
      const { rows } = await asUser(client, null, () => client.query("select reserved_email from public.invitations"));
      expect(rows).toEqual([]);
    });
  });

  describe("cloisonnement entre utilisateurs", () => {
    const ownTables = ["profiles", "goals", "user_modules", "body_weights"] as const;

    beforeAll(async () => {
      await asUserCommit(client, alice, async () => {
        await client.query("insert into public.goals (type, is_primary) values ('prise_de_masse', true)");
        await client.query("insert into public.user_modules (module) values ('musculation')");
        await client.query("insert into public.body_weights (measured_on, weight_kg) values ('2026-11-06', 85.2)");
      });
    });

    it.each(ownTables)("Alice voit ses propres lignes de %s", async (table) => {
      const n = await asUser(client, alice, async () => {
        const { rows } = await client.query(`select count(*)::int as n from public.${table}`);
        return rows[0].n;
      });
      expect(n).toBeGreaterThan(0);
    });

    it.each(ownTables)("Bruno ne voit aucune ligne d'Alice dans %s", async (table) => {
      const n = await asUser(client, bruno, async () => {
        const { rows } = await client.query(`select count(*)::int as n from public.${table} where user_id = $1`, [alice]);
        return rows[0].n;
      });
      expect(n).toBe(0);
    });

    it.each(ownTables)("Bruno ne peut ni modifier ni supprimer les lignes d'Alice dans %s", async (table) => {
      const result = await asUser(client, bruno, async () => {
        const updated = await client.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]);
        const deleted = await client.query(`delete from public.${table} where user_id = $1`, [alice]);
        return { updated: updated.rowCount, deleted: deleted.rowCount };
      });
      expect(result).toEqual({ updated: 0, deleted: 0 });
    });

    it("Bruno ne peut pas écrire une pesée au nom d'Alice", async () => {
      await expect(
        asUser(client, bruno, () =>
          client.query("insert into public.body_weights (user_id, measured_on, weight_kg) values ($1, '2026-11-07', 70)", [alice]),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it("un visiteur non connecté ne voit rien", async () => {
      const counts = await asUser(client, null, async () => {
        const out: number[] = [];
        for (const table of ownTables) {
          const { rows } = await client.query(`select count(*)::int as n from public.${table}`);
          out.push(rows[0].n);
        }
        return out;
      });
      expect(counts).toEqual([0, 0, 0, 0]);
    });

    it("refuse une deuxième pesée le même jour (elle doit remplacer la première)", async () => {
      await expect(
        asUser(client, alice, () =>
          client.query("insert into public.body_weights (measured_on, weight_kg) values ('2026-11-06', 85.6)"),
        ),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  describe("rôles et administration", () => {
    it("un utilisateur ne peut pas se donner le rôle admin", async () => {
      await expect(
        asUser(client, bruno, () => client.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [bruno])),
      ).rejects.toThrow(/row-level security/);
    });

    it("un non-admin ne peut ni créer de code ni lire les invitations ni les compteurs", async () => {
      await expect(asUser(client, bruno, () => client.query("select * from public.create_invitation()"))).rejects.toThrow(
        /admin_required/,
      );
      await expect(asUser(client, bruno, () => client.query("select * from public.admin_stats()"))).rejects.toThrow(
        /admin_required/,
      );
      const n = await asUser(client, bruno, async () => {
        const { rows } = await client.query("select count(*)::int as n from public.invitations");
        return rows[0].n;
      });
      expect(n).toBe(0);
    });

    it("un admin crée un code utilisable et ne voit que des compteurs", async () => {
      await client.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [alice]);

      const created = await asUser(client, alice, async () => {
        const { rows } = await client.query<{ code: string }>("select code from public.create_invitation(7)");
        const stats = await client.query("select * from public.admin_stats()");
        return { code: rows[0].code, stats: stats.rows[0] };
      });

      expect(created.code).toMatch(/^FONTE-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(Object.keys(created.stats).sort()).toEqual(["invitations_active", "invitations_used", "users"]);

      // asUser annule la transaction : on recrée le code pour de vrai avant de s'inscrire avec.
      await seedInvitation(client, created.code);
      const claire = await signUp(client, "claire@example.test", created.code.toLowerCase());
      expect(claire).toMatch(/[0-9a-f-]{36}/);
    });
  });
});
