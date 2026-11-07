import "server-only";
import { requireUserId } from "@/lib/auth";
import { isSite, PHOTO_BUCKET, SIGNED_URL_SECONDS, type BodySite, type PhotoPose } from "@/lib/body";
import { createClient } from "@/lib/supabase/server";

export type MeasurementRow = { date: string; site: BodySite; cm: number };

/** Toutes les mensurations de l'utilisateur, de la plus ancienne à la plus récente. */
export async function getMeasurements(): Promise<MeasurementRow[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_measurements")
    .select("measured_on, site, value_cm")
    .eq("user_id", userId)
    .order("measured_on")
    .limit(5000);
  return (data ?? []).filter((r) => isSite(r.site)).map((r) => ({ date: r.measured_on, site: r.site, cm: Number(r.value_cm) }));
}

export type Photo = { id: string; takenOn: string; pose: PhotoPose; path: string; url: string | null };

/** Liens d'affichage signés, valables 10 minutes, générés côté serveur. */
async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** Photos de progression, la plus récente en premier, avec leur lien d'affichage. */
export async function getPhotos(limit = 120): Promise<Photo[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select("id, taken_on, pose, storage_path")
    .eq("user_id", userId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const urls = await signedUrls(rows.map((r) => r.storage_path));
  return rows.map((r) => ({ id: r.id, takenOn: r.taken_on, pose: r.pose, path: r.storage_path, url: urls.get(r.storage_path) ?? null }));
}

/** Une photo et son lien d'affichage, ou null si elle n'existe pas (ou pas pour cet utilisateur). */
export async function getPhoto(id: string): Promise<Photo | null> {
  const userId = await requireUserId();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("progress_photos").select("id, taken_on, pose, storage_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const urls = await signedUrls([data.storage_path]);
  return { id: data.id, takenOn: data.taken_on, pose: data.pose, path: data.storage_path, url: urls.get(data.storage_path) ?? null };
}
