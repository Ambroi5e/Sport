import "server-only";
import { requireUserId } from "@/lib/auth";
import type { CatalogExercise } from "@/lib/engine";
import { toCatalog, type ExercisePreference } from "@/lib/program";
import { createClient } from "@/lib/supabase/server";
import { getExercises, getTrainingSetsSince } from "../data";

export async function getCatalog(): Promise<CatalogExercise[]> {
  return (await getExercises()).map(toCatalog);
}

export async function getPreferences(): Promise<Record<string, ExercisePreference>> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("exercise_preferences").select("exercise_id, preference").eq("user_id", userId);
  return Object.fromEntries((data ?? []).map((p) => [p.exercise_id, p.preference]));
}

export function splitPreferences(prefs: Record<string, ExercisePreference>) {
  const entries = Object.entries(prefs);
  return {
    liked: new Set(entries.filter(([, p]) => p === "aime").map(([id]) => id)),
    avoided: new Set(entries.filter(([, p]) => p === "evite").map(([id]) => id)),
  };
}

/** Nombre de séances où chaque exercice a été fait depuis `since`. */
export async function getUsage(since: string): Promise<Record<string, number>> {
  const sets = await getTrainingSetsSince(since);
  const workouts: Record<string, Set<string>> = {};
  for (const s of sets) (workouts[s.exerciseId] ??= new Set()).add(s.workoutId);
  return Object.fromEntries(Object.entries(workouts).map(([id, w]) => [id, w.size]));
}

const PROGRAM_COLUMNS =
  "id, name, starts_on, weeks, deload_every, sessions_per_week, session_minutes, equipment, priority_muscles, goal_exercise_id, goal_kg, goal_date, ended_on, goal:exercises!programs_goal_exercise_id_fkey(id, name)";

/** Programme en cours avec ses séances (modèles) dans l'ordre, ou null. */
export async function getActiveProgram() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: program } = await supabase.from("programs").select(PROGRAM_COLUMNS).eq("user_id", userId).is("ended_on", null).maybeSingle();
  if (!program) return null;

  const { data: templates } = await supabase
    .from("workout_templates")
    .select(
      "id, name, position, template_items(id, exercise_id, position, sets, rep_min, rep_max, exercises(id, name, equipment, measure, primary_muscles, secondary_muscles))",
    )
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .order("position");
  const sessions = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    items: [...t.template_items]
      .sort((a, b) => a.position - b.position)
      .flatMap((i) => (i.exercises ? [{ id: i.id, exerciseId: i.exercise_id, sets: i.sets, repMin: i.rep_min, repMax: i.rep_max, exercise: i.exercises }] : [])),
  }));

  // La prochaine séance suit la dernière séance du programme terminée.
  const { data: last } = sessions.length
    ? await supabase
        .from("workouts")
        .select("template_id, performed_on")
        .eq("user_id", userId)
        .in(
          "template_id",
          sessions.map((s) => s.id),
        )
        .not("ended_at", "is", null)
        .order("performed_on", { ascending: false })
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return { ...program, goalKg: program.goal_kg === null ? null : Number(program.goal_kg), sessions, lastDone: last ?? null };
}

export type ActiveProgram = NonNullable<Awaited<ReturnType<typeof getActiveProgram>>>;

/** Programme d'un modèle, pour la charge suggérée en séance. */
export async function getTemplateProgram(templateId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("program_id, programs(starts_on, deload_every, ended_on)")
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.programs && data.programs.ended_on === null ? data.programs : null;
}
