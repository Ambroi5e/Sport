import "server-only";
import { requireUserId } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { weeklyVolume, weekReview, type WeekReview } from "@/lib/engine";
import { weightRateTarget, type GoalType } from "@/lib/goals";
import type { SavedReview } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";
import { getTrainingSetsSince } from "../../entrainement/data";
import { getTargets } from "../../nutrition/data";
import { getCheckins } from "../forme/data";

/** Le bilan d'une semaine (lundi `weekStart`), recalculé depuis les données de la personne. */
export async function getWeekReview(
  weekStart: string,
  profile: { sessions_per_week: number | null; training_days: number[]; weekly_food_budget: number | null },
  goal: GoalType | null,
): Promise<WeekReview> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const weekEnd = addDays(weekStart, 6);
  const previous = addDays(weekStart, -7);
  const [workouts, activities, sets, logs, targets, weights, checkins, purchases] = await Promise.all([
    supabase.from("workouts").select("performed_on").eq("user_id", userId).not("ended_at", "is", null).gte("performed_on", weekStart).lte("performed_on", weekEnd),
    supabase.from("activities").select("performed_on, duration_minutes").eq("user_id", userId).gte("performed_on", weekStart).lte("performed_on", weekEnd),
    getTrainingSetsSince(previous),
    supabase.from("food_logs").select("eaten_on, grams, foods(kcal, protein_g)").eq("user_id", userId).gte("eaten_on", weekStart).lte("eaten_on", weekEnd).limit(2000),
    getTargets(),
    supabase.from("body_weights").select("measured_on, weight_kg").eq("user_id", userId).gte("measured_on", previous).lte("measured_on", weekEnd),
    getCheckins(weekStart),
    supabase.from("purchases").select("purchased_on, amount").eq("user_id", userId).gte("purchased_on", weekStart).lte("purchased_on", weekEnd),
  ]);

  const days = new Map<string, { kcal: number; proteinG: number }>();
  for (const row of logs.data ?? []) {
    if (!row.foods) continue;
    const day = days.get(row.eaten_on) ?? { kcal: 0, proteinG: 0 };
    const factor = Number(row.grams) / 100;
    day.kcal += Number(row.foods.kcal) * factor;
    day.proteinG += Number(row.foods.protein_g) * factor;
    days.set(row.eaten_on, day);
  }
  const [before, during] = weeklyVolume(sets.filter((s) => s.date <= weekEnd), weekEnd, 2);

  return weekReview({
    weekStart,
    sessionsPlanned: profile.sessions_per_week,
    workoutDates: (workouts.data ?? []).map((w) => w.performed_on),
    activities: (activities.data ?? []).map((a) => ({ date: a.performed_on, minutes: a.duration_minutes })),
    sets: during.sets,
    previousSets: before.sets,
    intake: [...days].map(([date, d]) => ({ date, ...d })),
    targets,
    trainingDays: profile.training_days,
    weights: (weights.data ?? []).map((w) => ({ date: w.measured_on, kg: Number(w.weight_kg) })),
    rateTarget: weightRateTarget(goal),
    checkins,
    purchases: (purchases.data ?? []).map((p) => ({ on: p.purchased_on, amount: Number(p.amount) })),
    budget: profile.weekly_food_budget === null ? null : Number(profile.weekly_food_budget),
  });
}

/** Ce que la personne a dit d'une semaine, s'il y a un bilan enregistré. */
export async function getSavedReview(weekStart: string): Promise<SavedReview | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_reviews").select("week_start, feeling, note").eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
  return data ? { weekStart: data.week_start, feeling: data.feeling, note: data.note } : null;
}

/** Les derniers bilans enregistrés, du plus récent au plus ancien. */
export async function getSavedReviews(limit = 12): Promise<SavedReview[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_reviews").select("week_start, feeling, note").eq("user_id", userId).order("week_start", { ascending: false }).limit(limit);
  return (data ?? []).map((r) => ({ weekStart: r.week_start, feeling: r.feeling, note: r.note }));
}
