import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

/**
 * Garde-fous sur tout le schéma : ils échouent dès qu'une migration future oublie
 * une règle de `docs/SECURITY.md`, sans attendre qu'un test par table y pense.
 */
describe.skipIf(!adminUrl)("sécurité du schéma entier", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("aucune politique n'est ouverte au visiteur ni à tout le monde", async () => {
    const { rows } = await client.query<{ policy: string }>(`
      select tablename || '.' || policyname as policy from pg_policies
      where schemaname = 'public' and (roles && array['anon', 'public']::name[])`);
    expect(rows.map((r) => r.policy)).toEqual([]);
  });

  it("aucune politique ne laisse tout passer (using true, with check true)", async () => {
    const { rows } = await client.query<{ policy: string }>(`
      select tablename || '.' || policyname as policy from pg_policies
      where schemaname = 'public' and (qual = 'true' or with_check = 'true')`);
    expect(rows.map((r) => r.policy)).toEqual([]);
  });

  it("chaque politique s'appuie sur l'identité de la personne connectée", async () => {
    // Directement (auth.uid()) ou par une fonction du schéma qui la vérifie (is_admin, is_group_member…).
    const { rows } = await client.query<{ policy: string }>(`
      select tablename || '.' || policyname as policy from pg_policies
      where schemaname = 'public'
        and coalesce(qual, '') || ' ' || coalesce(with_check, '') !~ '(auth\\.uid\\(\\)|is_admin\\(|is_friend\\(|is_group_member\\(|is_group_participant\\(|owns_group_session\\(|can_view\\()'`);
    expect(rows.map((r) => r.policy)).toEqual([]);
  });

  it("chaque fonction SECURITY DEFINER fixe un search_path vide", async () => {
    const { rows } = await client.query<{ fn: string }>(`
      select n.nspname || '.' || p.proname as fn from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') and p.prosecdef
        and not coalesce(p.proconfig, '{}') && array['search_path=""', 'search_path=']`);
    expect(rows.map((r) => r.fn)).toEqual([]);
  });

  it("chaque table a une clé primaire", async () => {
    const { rows } = await client.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'p')`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("chaque table rattachée à une personne part avec son compte", async () => {
    // Une colonne user_id sans clé étrangère vers auth.users en cascade laisserait des données après la suppression.
    const { rows } = await client.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'user_id' and not a.attisdropped
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (
          select 1 from pg_constraint k
          where k.conrelid = c.oid and k.contype = 'f' and k.confdeltype = 'c' and a.attnum = any (k.conkey)
        )`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("aucune vue du schéma public ne contourne la RLS", async () => {
    const { rows } = await client.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('v', 'm')
        and not coalesce(c.reloptions, '{}') @> array['security_invoker=true']`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});
