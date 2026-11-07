"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { toKg } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ weight: z.coerce.number().min(20).max(900) });

export type WeightState = { ok?: boolean; error?: string };

/** Enregistre la pesée du jour ; une nouvelle saisie le même jour remplace la précédente. */
export async function saveWeight(_prev: WeightState, formData: FormData): Promise<WeightState> {
  const profile = await getProfile();
  if (!profile) return { error: "Ta session a expiré. Reconnecte-toi." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Ce poids sort des valeurs possibles." };

  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const weightKg = Math.round(toKg(unit, parsed.data.weight) * 100) / 100;
  if (weightKg < 20 || weightKg > 400) return { error: "Ce poids sort des valeurs possibles." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("body_weights")
    .upsert(
      { user_id: profile.user_id, measured_on: localDate(profile.timezone), weight_kg: weightKg },
      { onConflict: "user_id,measured_on" },
    );
  if (error) return { error: "La pesée n'a pas été enregistrée. Vérifie ta connexion et réessaie." };

  revalidatePath("/");
  revalidatePath("/progres");
  return { ok: true };
}
