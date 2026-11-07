import "server-only";
import { addDays, localDate } from "@/lib/dates";
import { movingAverage, paceAlert, rateStatus, weeklyRate, type WeighIn } from "@/lib/engine";
import { weightRateTarget, type GoalType } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";

/** Pesées récentes et tendance, prêtes à afficher. */
export async function getWeightSummary(userId: string, timezone: string, goal: GoalType | null, days = 30) {
  const today = localDate(timezone);
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_weights")
    .select("measured_on, weight_kg")
    .eq("user_id", userId)
    .gte("measured_on", addDays(today, -days))
    .order("measured_on", { ascending: false });

  const entries: WeighIn[] = (data ?? []).map((r) => ({ date: r.measured_on, kg: Number(r.weight_kg) }));
  const rate = weeklyRate(entries, today);
  const target = weightRateTarget(goal);

  return {
    today,
    entries,
    latest: entries[0] ?? null,
    loggedToday: entries[0]?.date === today,
    average7: movingAverage(entries, today),
    rate,
    target,
    status: target ? rateStatus(rate, target) : null,
    alert: target ? paceAlert(entries, today, target) : null,
  };
}

export async function getPrimaryGoal(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("type, target_date")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  return data;
}
