"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type CheckinState = { error?: string; saved?: boolean };

const note = z.coerce.number().int().min(1).max(5);
const schema = z.object({ sleep: note, soreness: note, energy: note, stress: note });

/** Check-in du jour : le refaire le même jour le corrige. */
export async function saveCheckin(_: CheckinState, formData: FormData): Promise<CheckinState> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const parsed = schema.safeParse(Object.fromEntries(["sleep", "soreness", "energy", "stress"].map((k) => [k, formData.get(k)])));
  if (!parsed.success) return { error: "Donne une note de 1 à 5 à chacune des quatre lignes." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_checkins")
    .upsert({ user_id: profile.user_id, checkin_on: localDate(profile.timezone), ...parsed.data }, { onConflict: "user_id,checkin_on" });
  if (error) return { error: "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie." };

  revalidatePath("/");
  revalidatePath("/progres/forme");
  return { saved: true };
}
