"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate, weekStart as mondayOf } from "@/lib/dates";
import { isDay } from "@/lib/nutrition";
import { MAX_REVIEW_NOTE } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; saved?: boolean; values?: { feeling: string; note: string } };

/** Enregistre le ressenti et la note d'une semaine ; refaire le bilan le corrige. */
export async function saveReview(week: string, _prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireUserId();
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const today = localDate(profile.timezone);
  const values = { feeling: String(formData.get("feeling") ?? ""), note: String(formData.get("note") ?? "") };
  const parsed = z
    .object({
      // Un lundi, pas dans le futur, deux ans en arrière au plus.
      week: z.string().refine((w) => isDay(w) && mondayOf(w) === w && w <= today && w >= addDays(today, -730), "Cette semaine ne peut pas être enregistrée."),
      feeling: z.coerce.number({ error: "Dis comment s'est passée ta semaine." }).int().min(1, "Dis comment s'est passée ta semaine.").max(5),
      note: z.string().trim().max(MAX_REVIEW_NOTE, `Note : ${MAX_REVIEW_NOTE} caractères au maximum.`),
    })
    .safeParse({ week, ...values });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert({ week_start: parsed.data.week, feeling: parsed.data.feeling, note: parsed.data.note || null }, { onConflict: "user_id,week_start" });
  if (error) return { error: "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.", values };
  revalidatePath("/progres/bilan");
  revalidatePath("/");
  return { saved: true };
}
