import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUserId } from "@/lib/auth";
import { PHOTO_BUCKET, SIGNED_URL_SECONDS } from "@/lib/body";
import { catalogIds, EXPORT_TABLES, type FonteExport, type Row } from "@/lib/export/tables";
import { createClient } from "@/lib/supabase/server";

/** Supabase renvoie 1 000 lignes au plus par requête : on lit page par page. */
const PAGE = 1000;
/** Garde-fou : au-delà, l'export s'arrête plutôt que de tourner sans fin. */
const MAX_ROWS = 200_000;

async function readAll(db: SupabaseClient, table: string, order: string[], userId: string, owner: string[] = ["user_id"]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let query = db.from(table).select("*").or(owner.map((column) => `${column}.eq.${userId}`).join(","));
    for (const column of order) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`Lecture impossible : ${table}`);
    rows.push(...(data as Row[]));
    if (data.length < PAGE) return rows;
  }
  throw new Error(`Trop de lignes : ${table}`);
}

/** Noms des exercices et aliments du catalogue commun, par paquets d'identifiants. */
async function readCatalog(db: SupabaseClient, table: "exercises" | "foods", ids: string[]): Promise<Row[]> {
  const columns: string = table === "exercises" ? "id,name" : "id,name,brand";
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db.from(table).select(columns).is("user_id", null).in("id", ids.slice(i, i + 100));
    if (error) throw new Error(`Lecture impossible : catalogue ${table}`);
    rows.push(...(data as unknown as Row[]));
  }
  return rows;
}

/**
 * Toutes les données de la personne connectée, lues en son nom (RLS). Le filtre
 * sur la personne reste explicite : la RLS laisse voir ce qu'un ami nous montre
 * (`share_grants`), qui n'a rien à faire dans cet export.
 */
export async function collectExport(): Promise<FonteExport> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;

  const [{ data: auth }, ...tables] = await Promise.all([
    supabase.auth.getUser(),
    ...EXPORT_TABLES.map(({ table, order, owner }) => readAll(db, table, order, userId, owner)),
  ]);
  const data: FonteExport["tables"] = Object.fromEntries(EXPORT_TABLES.map(({ table }, i) => [table, tables[i]]));
  const [exercises, foods] = await Promise.all([
    readCatalog(db, "exercises", catalogIds(data, "exercises")),
    readCatalog(db, "foods", catalogIds(data, "foods")),
  ]);

  const user = auth.user;
  return {
    format: "fonte-export",
    version: 1,
    exported_at: new Date().toISOString(),
    account: {
      id: userId,
      email: user?.email ?? null,
      created_at: user?.created_at ?? null,
      providers: [...new Set((user?.identities ?? []).map((i) => i.provider))].sort(),
    },
    tables: data,
    catalog: { exercises, foods },
  };
}

export type PhotoLink = { id: string; taken_on: string; pose: string; url: string };

/** Liens signés de 10 minutes vers chaque photo : le téléphone les télécharge lui-même. */
export async function photoLinks(): Promise<PhotoLink[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const rows = (await readAll(db, "progress_photos", ["taken_on", "id"], userId)) as { id: string; taken_on: string; pose: string; storage_path: string }[];
  const links: PhotoLink[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(batch.map((r) => r.storage_path), SIGNED_URL_SECONDS);
    const urls = new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
    for (const r of batch) {
      const url = urls.get(r.storage_path);
      if (url) links.push({ id: r.id, taken_on: r.taken_on, pose: r.pose, url });
    }
  }
  return links;
}
