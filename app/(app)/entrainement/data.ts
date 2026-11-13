import "server-only";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { exerciseRecords, type ExerciseRecords, type SetEntry } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";
import type { ExerciseSummary } from "@/lib/training";

const EXERCISE_COLUMNS = "id, name, equipment, measure, primary_muscles, secondary_muscles, user_id";

/** Catalogue commun et exercices personnels non archivés, par ordre alphabétique. */
export async function getExercises(): Promise<ExerciseSummary[]> {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select(EXERCISE_COLUMNS).is("archived_at", null).order("name");
  return data ?? [];
}

export async function getExercise(id: string) {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select(`${EXERCISE_COLUMNS}, archived_at`).eq("id", id).maybeSingle();
  if (!data) notFound();
  return data;
}

/** Séries validées des exercices demandés, de la plus récente à la plus ancienne. */
export async function getCompletedSets(exerciseIds: string[], excludeWorkoutId?: string) {
  if (exerciseIds.length === 0) return [];
  const userId = await requireUserId();
  const supabase = await createClient();
  let query = supabase
    .from("workout_sets")
    .select("id, exercise_id, workout_id, set_number, weight_kg, reps, duration_seconds, is_warmup, completed_at, workouts!inner(performed_on, name, is_light)")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(3000);
  if (excludeWorkoutId) query = query.neq("workout_id", excludeWorkoutId);
  const { data } = await query;
  return (data ?? []).map((s) => ({
    id: s.id,
    exerciseId: s.exercise_id,
    workoutId: s.workout_id,
    workoutName: s.workouts.name,
    setNumber: s.set_number,
    date: s.workouts.performed_on,
    weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
    reps: s.reps,
    durationSeconds: s.duration_seconds,
    isWarmup: s.is_warmup,
    isLight: s.workouts.is_light,
    completedAt: s.completed_at!,
  }));
}

export type CompletedSet = Awaited<ReturnType<typeof getCompletedSets>>[number];

/** Pour chaque exercice : records et séries de la dernière séance où il a été fait. */
export function summarizeHistory(sets: CompletedSet[]) {
  const byExercise = new Map<string, CompletedSet[]>();
  for (const s of sets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);

  const out: Record<string, { records: ExerciseRecords; last: CompletedSet[]; lastDate: string | null }> = {};
  for (const [exerciseId, list] of byExercise) {
    const lastWorkout = list[0]?.workoutId;
    const last = list.filter((s) => s.workoutId === lastWorkout && !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber);
    out[exerciseId] = { records: exerciseRecords(list satisfies SetEntry[]), last, lastDate: list[0]?.date ?? null };
  }
  return out;
}

export async function getActiveWorkout() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, name, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getWorkout(id: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select(
      "id, name, performed_on, started_at, ended_at, template_id, is_light, workout_sets(id, exercise_id, exercise_order, set_number, weight_kg, reps, duration_seconds, rep_min, rep_max, is_warmup, completed_at, exercises(id, name, measure, equipment, primary_muscles, secondary_muscles))",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) notFound();

  const sets = [...data.workout_sets].sort((a, b) => a.exercise_order - b.exercise_order || a.set_number - b.set_number);
  const blocks: {
    order: number;
    exercise: NonNullable<(typeof sets)[number]["exercises"]>;
    sets: typeof sets;
  }[] = [];
  for (const s of sets) {
    const block = blocks.find((b) => b.order === s.exercise_order);
    if (block) block.sets.push(s);
    else if (s.exercises) blocks.push({ order: s.exercise_order, exercise: s.exercises, sets: [s] });
  }
  return { ...data, blocks };
}

export async function getTemplates() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("id, name, position, program_id, template_items(id, position, sets, exercises(name))")
    .eq("user_id", userId)
    .order("position")
    .order("created_at");
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    programId: t.program_id,
    exerciseNames: [...t.template_items].sort((a, b) => a.position - b.position).map((i) => i.exercises?.name ?? ""),
    totalSets: t.template_items.reduce((sum, i) => sum + i.sets, 0),
  }));
}

export async function getTemplate(id: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("id, name, template_items(id, exercise_id, position, sets, rep_min, rep_max, exercises(name, measure))")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) notFound();
  return { ...data, items: [...data.template_items].sort((a, b) => a.position - b.position) };
}

/** Séances terminées les plus récentes, avec nombre de séries et volume. */
export async function getWorkoutHistory(limit = 60) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, name, performed_on, started_at, ended_at, workout_sets(weight_kg, reps, is_warmup, completed_at)")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("performed_on", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((w) => {
    const done = w.workout_sets.filter((s) => s.completed_at && !s.is_warmup);
    return {
      id: w.id,
      name: w.name,
      performedOn: w.performed_on,
      startedAt: w.started_at,
      endedAt: w.ended_at,
      sets: done.length,
      volumeKg: done.reduce((sum, s) => sum + Number(s.weight_kg ?? 0) * (s.reps ?? 0), 0),
    };
  });
}

/** Séries validées depuis une date (incluse), avec les muscles de l'exercice. */
export async function getSetsSince(date: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id, workout_id, weight_kg, reps, is_warmup, workouts!inner(performed_on), exercises(primary_muscles, secondary_muscles)")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .gte("workouts.performed_on", date);
  const sets: SetEntry[] = [];
  const muscles: Record<string, { primary: string[]; secondary: string[] }> = {};
  for (const s of data ?? []) {
    sets.push({
      exerciseId: s.exercise_id,
      workoutId: s.workout_id,
      date: s.workouts.performed_on,
      weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
      reps: s.reps,
      isWarmup: s.is_warmup,
    });
    if (s.exercises) muscles[s.exercise_id] = { primary: s.exercises.primary_muscles, secondary: s.exercises.secondary_muscles };
  }
  return { sets, muscles };
}

const PAGE = 1000;

/**
 * Séries validées depuis une date (incluse), pour les courbes de force. Lues par
 * pages de 1 000 lignes, la limite par requête de l'API.
 */
export async function getTrainingSetsSince(date: string): Promise<SetEntry[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const sets: SetEntry[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("workout_sets")
      .select("id, exercise_id, workout_id, weight_kg, reps, duration_seconds, is_warmup, workouts!inner(performed_on)")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .gte("workouts.performed_on", date)
      .order("id")
      .range(from, from + PAGE - 1);
    for (const s of data ?? []) {
      sets.push({
        exerciseId: s.exercise_id,
        workoutId: s.workout_id,
        date: s.workouts.performed_on,
        weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
        reps: s.reps,
        durationSeconds: s.duration_seconds,
        isWarmup: s.is_warmup,
      });
    }
    if (!data || data.length < PAGE) return sets;
  }
}

/** Une date par séance terminée depuis `date` (incluse). */
export async function getFinishedWorkoutDates(date: string): Promise<string[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("performed_on")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .gte("performed_on", date);
  return (data ?? []).map((w) => w.performed_on);
}

/** Noms des exercices demandés, archivés compris (leurs séries restent dans l'historique). */
export async function getExerciseNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("id, name").in("id", ids);
  return Object.fromEntries((data ?? []).map((e) => [e.id, e.name]));
}
