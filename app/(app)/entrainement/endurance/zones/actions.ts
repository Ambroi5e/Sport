"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { MAX_HR_MAX, MAX_HR_REST, MIN_HR_MAX, MIN_HR_REST } from "@/lib/races";
import { createClient } from "@/lib/supabase/server";

export type HeartRateFormState = { error?: string; saved?: boolean; values?: Record<string, string> };

/** Enregistre la fréquence maximale et de repos sur le profil ; un champ vide efface la valeur. */
export async function saveHeartRates(_: HeartRateFormState, formData: FormData): Promise<HeartRateFormState> {
  const userId = await requireUserId();
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const values = { max: text("max"), rest: text("rest") };
  const whole = (value: string) => (value === "" ? null : /^\d{2,3}$/.test(value) ? Number(value) : NaN);
  const hrMax = whole(values.max);
  const hrRest = whole(values.rest);
  if (hrMax !== null && !(hrMax >= MIN_HR_MAX && hrMax <= MAX_HR_MAX)) return { error: `Indique une fréquence maximale entre ${MIN_HR_MAX} et ${MAX_HR_MAX}.`, values };
  if (hrRest !== null && !(hrRest >= MIN_HR_REST && hrRest <= MAX_HR_REST)) return { error: `Indique une fréquence de repos entre ${MIN_HR_REST} et ${MAX_HR_REST}.`, values };
  if (hrMax !== null && hrRest !== null && hrRest >= hrMax) return { error: "La fréquence de repos est plus basse que la fréquence maximale.", values };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ hr_max: hrMax, hr_rest: hrRest }).eq("user_id", userId);
  if (error) return { error: "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.", values };
  revalidatePath("/entrainement/endurance/zones");
  return { saved: true };
}
