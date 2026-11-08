"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DELETE_CONFIRMATION } from "@/lib/account";
import { STYLE_IDS } from "@/lib/appearance";
import { requireUserId } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/body";
import { createClient } from "@/lib/supabase/server";

const PREFERENCE_COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: true } as const;

export async function setTheme(formData: FormData) {
  const theme = z.enum(["dark", "light"]).catch("dark").parse(formData.get("theme"));
  (await cookies()).set("theme", theme, PREFERENCE_COOKIE);
  revalidatePath("/", "layout");
}

export async function setStyle(formData: FormData) {
  const style = z.enum(STYLE_IDS).catch("fonte").parse(formData.get("style"));
  (await cookies()).set("style", style, PREFERENCE_COOKIE);
  revalidatePath("/", "layout");
}

export async function setWeightUnit(formData: FormData) {
  const userId = await requireUserId();
  const unit = z.enum(["kg", "lb"]).catch("kg").parse(formData.get("unit"));
  const supabase = await createClient();
  await supabase.from("profiles").update({ weight_unit: unit }).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export type DeleteAccountState = { error?: string };

const PHOTOS_ERROR = "Tes photos n'ont pas pu être effacées, donc rien n'a été supprimé. Réessaie dans un instant.";

/**
 * Supprime le compte de la personne connectée. D'abord tout son dossier de photos
 * (par l'API Storage : Supabase refuse de l'effacer en SQL), puis le compte, que
 * toutes les tables suivent par cascade. La fonction SQL refuse tant qu'il reste
 * une photo, donc un échec à mi-chemin ne laisse jamais de fichier orphelin.
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const userId = await requireUserId();
  const typed = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (typed !== DELETE_CONFIRMATION) return { error: `Tape ${DELETE_CONFIRMATION} pour confirmer.` };

  const supabase = await createClient();
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  for (let round = 0; round < 100; round++) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    if (error) return { error: PHOTOS_ERROR };
    const files = data.filter((f) => f.id !== null).map((f) => `${userId}/${f.name}`);
    if (files.length === 0) break;
    const { error: removeError } = await bucket.remove(files);
    if (removeError) return { error: PHOTOS_ERROR };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    return { error: error.message.includes("photos_remaining") ? PHOTOS_ERROR : "La suppression a échoué et rien n'a été effacé. Réessaie dans un instant." };
  }
  // La session n'existe plus chez Supabase : on retire ses cookies. La page
  // d'arrivée vide ensuite ce que l'app gardait sur le téléphone.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/compte-supprime");
}
