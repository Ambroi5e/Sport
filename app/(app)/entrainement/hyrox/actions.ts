"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { HYROX_SPLITS, parseClock } from "@/lib/engine";
import { MAX_RACE_S, MAX_SPLIT_S, MIN_RACE_S, segmentLabel } from "@/lib/hyrox";
import { isDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

/** `values` renvoie la saisie quand elle est refusée : le formulaire la garde au lieu de se vider. */
export type HyroxFormState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";

function refresh() {
  for (const path of ["/", "/entrainement", "/entrainement/sports", "/entrainement/hyrox", "/nutrition"]) revalidatePath(path);
}

/** Crée (`id` vide) ou corrige une course Hyrox, puis revient à l'écran Hyrox. */
export async function saveHyrox(id: string | null, _: HyroxFormState, formData: FormData): Promise<HyroxFormState> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const values = Object.fromEntries([...formData.entries()].flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const today = localDate(profile.timezone);
  const day = text("date") || today;
  if (!isDay(day) || day > today || day < addDays(today, -730)) return { error: "Choisis une date passée, de moins de deux ans.", values };

  const seconds = parseClock(text("total"));
  if (seconds === null || seconds < MIN_RACE_S || seconds > MAX_RACE_S) return { error: "Écris ton temps total comme 1:24:35 (heures, minutes, secondes).", values };

  const splits: (number | null)[] = [];
  for (let i = 0; i < HYROX_SPLITS; i++) {
    const raw = text(`s${i}`);
    const split = raw ? parseClock(raw) : null;
    if (raw && (split === null || split < 1 || split > MAX_SPLIT_S)) return { error: `Le temps de « ${segmentLabel(i)} » n'est pas lisible : écris-le comme 4:35.`, values };
    splits.push(split);
  }
  if (splits.reduce<number>((sum, s) => sum + (s ?? 0), 0) > seconds) return { error: "Les temps notés dépassent le temps total. Vérifie l'un ou l'autre.", values };

  const supabase = await createClient();
  const row = {
    performed_on: day,
    sport: "hyrox" as const,
    duration_minutes: Math.floor(seconds / 60),
    duration_extra_s: seconds % 60,
    hyrox_splits: splits.some((s) => s !== null) ? (splits as number[]) : null,
  };
  // L'intensité ne se choisit pas ici : « intense » à la création, inchangée ensuite.
  const { error } = id
    ? await supabase.from("activities").update(row).eq("id", z.uuid().parse(id)).eq("sport", "hyrox")
    : await supabase.from("activities").insert({ ...row, intensity: "intense" });
  if (error) return { error: SAVE_ERROR, values };

  refresh();
  redirect("/entrainement/hyrox");
}

export async function deleteHyrox(id: string) {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", z.uuid().parse(id)).eq("sport", "hyrox");
  if (error) throw new Error("hyrox_not_deleted");
  refresh();
  redirect("/entrainement/hyrox");
}
