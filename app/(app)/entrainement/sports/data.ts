import "server-only";
import { requireUserId } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { activitiesKcal, weightOn, type Intensity, type WeighIn } from "@/lib/engine";
import { SPORTS, type Sport } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";

/** `weightKg` : la pesée retenue pour la dépense, `null` sans aucune pesée. */
export type Activity = {
  id: string;
  date: string;
  sport: Sport;
  label: string | null;
  minutes: number;
  intensity: Intensity;
  kcal: number | null;
  weightKg: number | null;
};

const COLUMNS = "id, performed_on, sport, label, duration_minutes, intensity";

type Row = { id: string; performed_on: string; sport: Sport; label: string | null; duration_minutes: number; intensity: Intensity };

/**
 * Pesées utiles au calcul de la dépense : depuis 90 jours avant la première
 * activité (la dernière pesée d'avant chaque activité, ou la première d'après).
 */
async function weightsFor(userId: string, dates: string[]): Promise<WeighIn[]> {
  if (dates.length === 0) return [];
  const supabase = await createClient();
  const first = dates.reduce((a, b) => (a < b ? a : b));
  const { data } = await supabase
    .from("body_weights")
    .select("measured_on, weight_kg")
    .eq("user_id", userId)
    .gte("measured_on", addDays(first, -90))
    .order("measured_on", { ascending: false })
    .limit(1000);
  return (data ?? []).map((w) => ({ date: w.measured_on, kg: Number(w.weight_kg) }));
}

async function withKcal(userId: string, rows: Row[]): Promise<Activity[]> {
  const list = rows.map((r) => ({ id: r.id, date: r.performed_on, sport: r.sport, label: r.label, minutes: r.duration_minutes, intensity: r.intensity }));
  const weights = await weightsFor(userId, list.map((a) => a.date));
  const kcal = activitiesKcal(list, weights);
  return list.map((a, i) => ({ ...a, kcal: kcal[i], weightKg: weightOn(weights, a.date) }));
}

/** Dernières activités, la plus récente en premier, avec leur dépense estimée. */
export async function getActivities(limit = 30): Promise<Activity[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return withKcal(userId, data ?? []);
}

export async function getActivity(id: string): Promise<Activity | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select(COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  return data ? (await withKcal(userId, [data]))[0] : null;
}

/** Une date par activité depuis `date` (inclus), pour la semaine de l'accueil. */
export async function getActivityDates(date: string): Promise<string[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select("performed_on").eq("user_id", userId).gte("performed_on", date);
  return (data ?? []).map((a) => a.performed_on);
}

/**
 * Habitudes pour préremplir la saisie : la dernière activité, et les sports
 * dans l'ordre où on les pratique le plus (les autres ensuite, « Autre » en dernier).
 */
export async function getSportHabits(): Promise<{ last: Omit<Activity, "kcal" | "weightKg"> | null; order: Sport[] }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  const count = (s: Sport) => rows.filter((r) => r.sport === s).length;
  const order = SPORTS.filter((s) => s !== "autre" && count(s) > 0)
    .sort((a, b) => count(b) - count(a))
    .concat(SPORTS.filter((s) => s !== "autre" && count(s) === 0), ["autre"]);
  const r = rows[0];
  return {
    last: r ? { id: r.id, date: r.performed_on, sport: r.sport, label: r.label, minutes: r.duration_minutes, intensity: r.intensity } : null,
    order,
  };
}

/** Dernière pesée, pour la dépense estimée pendant la saisie. */
export async function getLatestWeightKg(): Promise<number | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("body_weights").select("weight_kg").eq("user_id", userId).order("measured_on", { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.weight_kg) : null;
}
