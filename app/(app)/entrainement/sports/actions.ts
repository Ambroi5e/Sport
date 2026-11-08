"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { INTENSITIES } from "@/lib/engine";
import { isDay } from "@/lib/nutrition";
import { LABEL_MAX, MAX_DURATION, MIN_DURATION, SPORTS } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";

/** `values` renvoie la saisie quand elle est refusée : le formulaire la garde au lieu de se vider. */
export type ActivityFormState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";

const schema = z.object({
  sport: z.enum(SPORTS),
  label: z.string().trim().max(LABEL_MAX),
  minutes: z.coerce.number().int().min(MIN_DURATION).max(MAX_DURATION),
  intensity: z.enum(INTENSITIES),
});

function refresh() {
  for (const path of ["/", "/entrainement", "/entrainement/sports", "/nutrition"]) revalidatePath(path);
}

/** Crée (`id` vide) ou corrige une activité, puis revient à la liste des sports. */
export async function saveActivity(id: string | null, _: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const values = Object.fromEntries([...formData.entries()].flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const parsed = schema.safeParse({
    sport: formData.get("sport"),
    label: formData.get("label") ?? "",
    minutes: formData.get("minutes"),
    intensity: formData.get("intensity"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const error =
      field === "minutes"
        ? `Indique une durée entre ${MIN_DURATION} et ${MAX_DURATION} minutes.`
        : field === "intensity"
          ? "Choisis l'intensité."
          : field === "label"
            ? `Le nom tient en ${LABEL_MAX} caractères.`
            : "Choisis un sport.";
    return { error, values };
  }
  const { sport, minutes, intensity } = parsed.data;
  const label = sport === "autre" ? parsed.data.label : "";
  if (sport === "autre" && !label) return { error: "Donne un nom à ce sport.", values };

  const today = localDate(profile.timezone);
  const day = formData.get("date") || today;
  if (!isDay(day) || day > today || day < addDays(today, -730)) return { error: "Choisis une date passée, de moins de deux ans.", values };

  const supabase = await createClient();
  const row = { performed_on: day, sport, label: label || null, duration_minutes: minutes, intensity };
  const { error } = id ? await supabase.from("activities").update(row).eq("id", z.uuid().parse(id)) : await supabase.from("activities").insert(row);
  if (error) return { error: SAVE_ERROR, values };

  refresh();
  redirect("/entrainement/sports");
}

export async function deleteActivity(id: string) {
  await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", z.uuid().parse(id));
  if (error) throw new Error("activity_not_deleted");
  refresh();
  redirect("/entrainement/sports");
}
