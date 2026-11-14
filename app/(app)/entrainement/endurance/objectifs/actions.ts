"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { parseClock } from "@/lib/engine";
import { isDay } from "@/lib/nutrition";
import { MAX_RACE_M, MAX_TARGET_S, MIN_RACE_M, MIN_TARGET_S, RACE_DAYS_AHEAD, RACE_DAYS_BACK, RACE_NAME_MAX, RACE_PRESETS } from "@/lib/races";
import { parseDistance } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";

/** `values` renvoie la saisie quand elle est refusée : le formulaire la garde au lieu de se vider. */
export type RacePlanFormState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";
const LIST = "/entrainement/endurance/objectifs";

/** Crée (`id` vide) ou corrige un objectif de course, puis revient à la liste. */
export async function saveRacePlan(id: string | null, _: RacePlanFormState, formData: FormData): Promise<RacePlanFormState> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const values = Object.fromEntries([...formData.entries()].flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const name = text("name");
  if (!name || name.length > RACE_NAME_MAX) return { error: `Donne un nom à la course, en ${RACE_NAME_MAX} caractères au plus.`, values };

  const today = localDate(profile.timezone);
  const day = text("date");
  if (!isDay(day) || day < addDays(today, -RACE_DAYS_BACK) || day > addDays(today, RACE_DAYS_AHEAD)) return { error: "Choisis la date de la course, dans les trois ans à venir.", values };

  const preset = RACE_PRESETS.find((p) => String(p.meters) === text("distance"));
  const distanceM = preset ? preset.meters : parseDistance(text("km"), "course");
  if (distanceM === null || distanceM < MIN_RACE_M || distanceM > MAX_RACE_M) return { error: "Indique une distance entre 1 et 250 km.", values };

  let targetSeconds: number | null = null;
  if (text("target")) {
    targetSeconds = parseClock(text("target"));
    if (targetSeconds === null || targetSeconds < MIN_TARGET_S || targetSeconds > MAX_TARGET_S) return { error: "Écris le temps visé comme 49:30 ou 1:45:00.", values };
  }

  const supabase = await createClient();
  const row = { name, race_on: day, distance_m: distanceM, target_seconds: targetSeconds };
  const { error } = id ? await supabase.from("race_plans").update(row).eq("id", z.uuid().parse(id)) : await supabase.from("race_plans").insert(row);
  if (error) return { error: SAVE_ERROR, values };

  revalidatePath(LIST);
  redirect(LIST);
}

export async function deleteRacePlan(id: string) {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("race_plans").delete().eq("id", z.uuid().parse(id));
  if (error) throw new Error("race_plan_not_deleted");
  revalidatePath(LIST);
  redirect(LIST);
}
