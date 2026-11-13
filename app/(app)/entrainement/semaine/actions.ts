"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/dates";
import { INTENSITIES } from "@/lib/engine";
import { isDay } from "@/lib/nutrition";
import { LABEL_MAX, MAX_DURATION, MIN_DURATION, SPORTS } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";

export type WeeklySportState = { error?: string; values?: Record<string, string> };

const id = z.uuid();
const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";
/** Au-delà, la semaine type n'en est plus une. */
const MAX_WEEKLY_SPORTS = 14;

async function thisWeek() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const today = localDate(profile.timezone);
  const monday = weekStart(today);
  return { userId: profile.user_id, today, monday, sunday: addDays(monday, 6) };
}

function refresh() {
  for (const path of ["/", "/entrainement", "/entrainement/semaine", "/entrainement/programme"]) revalidatePath(path);
}

/**
 * Pose une séance du programme sur un jour de cette semaine, d'aujourd'hui à
 * dimanche. Le jour choisi lui est réservé : plus de repos ajouté à la main ni
 * d'autre séance posée dessus (elle retourne au placement automatique).
 */
export async function moveSession(templateId: string, formData: FormData) {
  const { userId, today, monday, sunday } = await thisWeek();
  const tid = id.parse(templateId);
  const date = formData.get("date");
  if (!isDay(date) || date < today || date > sunday) throw new Error("invalid_day");

  const supabase = await createClient();
  await supabase.from("blocked_days").delete().eq("user_id", userId).eq("blocked_on", date);
  await supabase.from("session_pins").delete().eq("user_id", userId).eq("week_start", monday).eq("planned_on", date).neq("template_id", tid);
  const { error } = await supabase
    .from("session_pins")
    .upsert({ user_id: userId, week_start: monday, template_id: tid, planned_on: date }, { onConflict: "user_id,week_start,template_id" });
  if (error) throw new Error("session_not_moved");
  refresh();
  redirect("/entrainement/semaine");
}

/** Rend une séance au placement automatique. */
export async function resetSession(templateId: string) {
  const { userId, monday } = await thisWeek();
  const supabase = await createClient();
  const { error } = await supabase.from("session_pins").delete().eq("user_id", userId).eq("week_start", monday).eq("template_id", id.parse(templateId));
  if (error) throw new Error("session_not_reset");
  refresh();
  redirect("/entrainement/semaine");
}

/** Décale la séance du jour : aujourd'hui devient un jour sans séance, le planning la replace. */
export async function postponeSession(templateId: string) {
  const { userId, today, monday } = await thisWeek();
  const supabase = await createClient();
  await supabase.from("session_pins").delete().eq("user_id", userId).eq("week_start", monday).eq("template_id", id.parse(templateId)).eq("planned_on", today);
  const { error } = await supabase.from("blocked_days").upsert({ user_id: userId, blocked_on: today }, { onConflict: "user_id,blocked_on", ignoreDuplicates: true });
  if (error) throw new Error("session_not_postponed");
  refresh();
  redirect("/entrainement/semaine");
}

/** Annule un jour sans séance ajouté à la main. */
export async function freeDay(date: string) {
  const { userId, monday, sunday } = await thisWeek();
  if (!isDay(date) || date < monday || date > sunday) throw new Error("invalid_day");
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_days").delete().eq("user_id", userId).eq("blocked_on", date);
  if (error) throw new Error("day_not_freed");
  refresh();
  redirect("/entrainement/semaine");
}

// Semaine type --------------------------------------------------------------------

const daysSchema = z.array(z.coerce.number().int().min(1).max(7)).max(7);

/** Jours disponibles : les mêmes que les jours d'entraînement des cibles de nutrition. */
export async function saveAvailableDays(formData: FormData) {
  const { userId } = await thisWeek();
  const days = daysSchema.parse(formData.getAll("days"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ training_days: [...new Set(days)].sort() })
    .eq("user_id", userId);
  if (error) throw new Error("days_not_saved");
  refresh();
  revalidatePath("/nutrition", "layout");
  redirect("/entrainement/semaine");
}

const sportSchema = z.object({
  weekday: z.coerce.number().int().min(1).max(7),
  sport: z.enum(SPORTS),
  label: z.string().trim().max(LABEL_MAX),
  minutes: z.coerce.number().int().min(MIN_DURATION).max(MAX_DURATION),
  intensity: z.enum(INTENSITIES),
});

export async function addWeeklySport(_: WeeklySportState, formData: FormData): Promise<WeeklySportState> {
  const { userId } = await thisWeek();
  const values = Object.fromEntries([...formData.entries()].flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const parsed = sportSchema.safeParse({
    weekday: formData.get("weekday"),
    sport: formData.get("sport"),
    label: formData.get("label") ?? "",
    minutes: formData.get("minutes"),
    intensity: formData.get("intensity"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const error =
      field === "weekday"
        ? "Choisis le jour."
        : field === "minutes"
          ? `Indique une durée entre ${MIN_DURATION} et ${MAX_DURATION} minutes.`
          : field === "intensity"
            ? "Choisis l'intensité."
            : field === "label"
              ? `Le nom tient en ${LABEL_MAX} caractères.`
              : "Choisis un sport.";
    return { error, values };
  }
  const { weekday, sport, minutes, intensity } = parsed.data;
  const label = sport === "autre" ? parsed.data.label : "";
  if (sport === "autre" && !label) return { error: "Donne un nom à ce sport.", values };

  const supabase = await createClient();
  const { count } = await supabase.from("weekly_sports").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_WEEKLY_SPORTS) return { error: `La semaine type garde ${MAX_WEEKLY_SPORTS} sports au plus : retires-en un d'abord.`, values };
  const { error } = await supabase.from("weekly_sports").insert({ weekday, sport, label: label || null, duration_minutes: minutes, intensity });
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  redirect("/entrainement/semaine/type");
}

export async function deleteWeeklySport(sportId: string) {
  const { userId } = await thisWeek();
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_sports").delete().eq("user_id", userId).eq("id", id.parse(sportId));
  if (error) throw new Error("weekly_sport_not_deleted");
  refresh();
  redirect("/entrainement/semaine/type");
}
