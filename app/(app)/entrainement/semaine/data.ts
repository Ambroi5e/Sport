import "server-only";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/dates";
import {
  planWeek,
  recoveryMuscles,
  SPORT_EFFORT,
  STRENGTH_EFFORT,
  todayOptions,
  trainingLoad,
  workoutMinutes,
  type LoadEntry,
  type PlanInput,
} from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";
import { getCheckin } from "../../progres/forme/data";
import { getActiveProgram } from "../programme/data";

/**
 * Tout ce qu'il faut pour le planning de la semaine : le programme en cours, les
 * séances et sports des 28 derniers jours (récupération et charge), la semaine
 * type, les changements faits à la main et la forme du jour. Le planning lui-même
 * est calculé ici, à la lecture.
 */
export async function getWeekContext() {
  const profile = (await getProfile())!;
  const userId = profile.user_id;
  const today = localDate(profile.timezone);
  const monday = weekStart(today);
  const since = addDays(today, -27);
  const supabase = await createClient();

  const [program, workoutRows, activityRows, weeklyRows, pinRows, blockedRows, checkin] = await Promise.all([
    getActiveProgram(),
    supabase
      .from("workouts")
      .select("id, name, template_id, performed_on, started_at, ended_at, is_light, workout_sets(completed_at, exercises(primary_muscles))")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("performed_on", since)
      .order("performed_on")
      .order("started_at"),
    supabase.from("activities").select("performed_on, sport, label, duration_minutes, intensity").eq("user_id", userId).gte("performed_on", since).order("performed_on"),
    supabase.from("weekly_sports").select("id, weekday, sport, label, duration_minutes, intensity").eq("user_id", userId).order("weekday").order("created_at"),
    supabase.from("session_pins").select("template_id, planned_on").eq("user_id", userId).eq("week_start", monday),
    supabase.from("blocked_days").select("blocked_on").eq("user_id", userId).gte("blocked_on", monday).lte("blocked_on", addDays(monday, 6)),
    getCheckin(today),
  ]);

  const sessions = (program?.sessions ?? []).map((s) => ({ id: s.id, name: s.name, muscles: recoveryMuscles(s.items.map((i) => i.exercise.primary_muscles)) }));
  const sessionIds = new Set(sessions.map((s) => s.id));
  const workouts = (workoutRows.data ?? []).map((w) => ({
    date: w.performed_on,
    templateId: w.template_id,
    name: w.name,
    isLight: w.is_light,
    muscles: recoveryMuscles(w.workout_sets.flatMap((s) => (s.completed_at && s.exercises ? [s.exercises.primary_muscles] : []))),
    minutes: workoutMinutes(w.started_at, w.ended_at),
  }));
  const activities = (activityRows.data ?? []).map((a) => ({ date: a.performed_on, sport: a.sport, label: a.label, minutes: a.duration_minutes, intensity: a.intensity }));
  const weeklySports = (weeklyRows.data ?? []).map((w) => ({ id: w.id, weekday: w.weekday, sport: w.sport, label: w.label, minutes: w.duration_minutes, intensity: w.intensity }));

  // Dernière séance du programme d'avant lundi : dans les 28 jours lus, sinon la toute dernière connue.
  const before = workouts.filter((w) => w.date < monday && w.templateId !== null && sessionIds.has(w.templateId)).at(-1);
  const older = program?.lastDone && program.lastDone.performed_on < monday ? program.lastDone.template_id : null;

  const input: PlanInput = {
    today,
    sessions,
    lastDoneBeforeWeek: before?.templateId ?? older,
    availableDays: profile.training_days,
    workouts: workouts.filter((w) => w.date >= addDays(monday, -1)),
    activities: activities.filter((a) => a.date >= addDays(monday, -1)),
    weeklySports,
    pins: (pinRows.data ?? []).map((p) => ({ templateId: p.template_id, date: p.planned_on })),
    blocked: (blockedRows.data ?? []).map((b) => b.blocked_on),
  };
  const plan = planWeek(input);
  const entries: LoadEntry[] = [
    ...workouts.map((w) => ({ date: w.date, minutes: w.minutes, effort: STRENGTH_EFFORT })),
    ...activities.map((a) => ({ date: a.date, minutes: a.minutes, effort: SPORT_EFFORT[a.intensity] })),
  ];
  const load = trainingLoad(entries, today);

  return { profile, today, monday, program, input, plan, load, checkin, weeklySports, options: todayOptions(input, plan, checkin, load.ratio) };
}

export type WeekContext = Awaited<ReturnType<typeof getWeekContext>>;
