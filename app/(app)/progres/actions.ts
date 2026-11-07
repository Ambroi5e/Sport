"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { BODY_SITES, isPose, PHOTO_BUCKET, PHOTO_MAX_BYTES, SITE_LABELS, type BodySite } from "@/lib/body";
import { addDays, localDate } from "@/lib/dates";
import { isDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

/** `values` renvoie la saisie quand elle est refusée : le formulaire la garde au lieu de se vider. */
export type FormState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";

/** Nombre saisi au clavier français (« 38,5 ») ; vide devient null. */
function decimal(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

/** Jour visé : jamais dans le futur, au plus deux ans en arrière. */
async function pastDay(value: FormDataEntryValue | null): Promise<string | null> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const today = localDate(profile.timezone);
  if (value === null || value === "") return today;
  return isDay(value) && value <= today && value >= addDays(today, -730) ? value : null;
}

function echo(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
}

// Mensurations -------------------------------------------------------------------

const cm = z.number().min(10).max(250);

/**
 * Enregistre les zones remplies pour un jour (ressaisir remplace la valeur) et
 * supprime celles qu'on a vidées ce jour-là.
 */
export async function saveMeasurements(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const values = echo(formData);
  const day = await pastDay(formData.get("date"));
  if (!day) return { error: "Choisis une date passée, de moins de deux ans.", values };

  const filled: { site: BodySite; value: number }[] = [];
  const cleared: BodySite[] = [];
  for (const site of BODY_SITES) {
    const raw = decimal(formData.get(site));
    if (raw === null) {
      cleared.push(site);
      continue;
    }
    if (!cm.safeParse(raw).success) return { error: `${SITE_LABELS[site]} : indique une valeur entre 10 et 250 cm.`, values };
    filled.push({ site, value: Math.round(raw * 10) / 10 });
  }

  const supabase = await createClient();
  if (filled.length === 0) {
    const { count } = await supabase.from("body_measurements").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("measured_on", day);
    if (!count) return { error: "Saisis au moins une mesure.", values };
  }

  const now = new Date().toISOString();
  const [saved, removed] = await Promise.all([
    filled.length
      ? supabase.from("body_measurements").upsert(
          filled.map((f) => ({ user_id: userId, measured_on: day, site: f.site, value_cm: f.value, updated_at: now })),
          { onConflict: "user_id,measured_on,site" },
        )
      : Promise.resolve({ error: null }),
    cleared.length ? supabase.from("body_measurements").delete().eq("user_id", userId).eq("measured_on", day).in("site", cleared) : Promise.resolve({ error: null }),
  ]);
  if (saved.error || removed.error) return { error: SAVE_ERROR, values };
  revalidatePath("/progres/mensurations");
  redirect("/progres/mensurations");
}

// Photos -------------------------------------------------------------------------

/** Les trois premiers octets d'un JPEG. */
function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Dépose la photo dans le dossier de l'utilisateur, puis enregistre la ligne.
 * La photo arrive déjà réduite et réencodée par le téléphone (sans EXIF) ; le
 * serveur revérifie le type, la taille et la signature JPEG.
 */
export async function uploadPhoto(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const values = { pose: String(formData.get("pose") ?? ""), date: String(formData.get("date") ?? "") };
  const pose = formData.get("pose");
  if (!isPose(pose)) return { error: "Choisis une pose : face, profil ou dos.", values };
  const day = await pastDay(formData.get("date"));
  if (!day) return { error: "Choisis une date passée, de moins de deux ans.", values };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une photo.", values };
  if (file.type !== "image/jpeg" || file.size > PHOTO_MAX_BYTES) return { error: "La photo doit être un JPEG d'1 Mo au plus.", values };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return { error: "Ce fichier n'est pas une image JPEG.", values };

  const id = crypto.randomUUID();
  const path = `${userId}/${id}.jpg`;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (uploadError) return { error: SAVE_ERROR, values };
  const { error } = await supabase.from("progress_photos").insert({ id, user_id: userId, taken_on: day, pose, storage_path: path });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return { error: SAVE_ERROR, values };
  }
  revalidatePath("/progres/photos");
  redirect("/progres/photos");
}

/** Efface le fichier d'abord, puis la ligne : jamais de photo orpheline dans le bucket. */
export async function deletePhoto(photoId: string): Promise<void> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(photoId).success) redirect("/progres/photos");
  const supabase = await createClient();
  const { data } = await supabase.from("progress_photos").select("storage_path").eq("id", photoId).eq("user_id", userId).maybeSingle();
  if (data) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([data.storage_path]);
    if (error) throw new Error("Le fichier n'a pas pu être supprimé.");
    await supabase.from("progress_photos").delete().eq("id", photoId).eq("user_id", userId);
  }
  revalidatePath("/progres/photos");
  redirect("/progres/photos");
}
