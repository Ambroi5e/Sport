"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, getUserId, requireUserId } from "@/lib/auth";
import { formatShortDate, localDate } from "@/lib/dates";
import { plausibleTime, prefillSets, toKg } from "@/lib/engine";
import { programSuggestions } from "@/lib/program";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";
import { getCompletedSets, summarizeHistory } from "./data";

export type FormState = { error?: string };

const id = z.uuid();
const SAVE_ERROR = "La modification n'a pas été enregistrée. Vérifie ta connexion et réessaie.";

type PlannedItem = {
  exerciseId: string;
  order: number;
  sets?: number | null;
  repMin?: number | null;
  repMax?: number | null;
  exercise?: { equipment: string; measure: string; primary_muscles: string[] } | null;
};

/**
 * Séries préremplies prêtes à insérer : la dernière performance, sinon la cible du
 * modèle. Dans une séance du programme en cours, la charge suggérée du jour
 * (double progression, décharge, séance allégée).
 */
async function plannedRows(workoutId: string, items: PlannedItem[], program?: { starts_on: string; deload_every: number } | null, date?: string, light = false) {
  const completed = await getCompletedSets(items.map((i) => i.exerciseId));
  const history = summarizeHistory(completed);
  const suggested =
    program && date
      ? programSuggestions(
          completed,
          items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets ?? 3, repMin: i.repMin ?? null, repMax: i.repMax ?? null, exercise: i.exercise ?? null })),
          program,
          date,
          light,
        )
      : [];
  return items.flatMap((item, index) =>
    (suggested[index]?.sets ?? prefillSets(history[item.exerciseId]?.last ?? [], { sets: item.sets, repMin: item.repMin, repMax: item.repMax })).map((s) => ({
      workout_id: workoutId,
      exercise_id: item.exerciseId,
      exercise_order: item.order,
      set_number: s.setNumber,
      weight_kg: s.weightKg,
      reps: s.reps,
      duration_seconds: s.durationSeconds,
      rep_min: s.repMin,
      rep_max: s.repMax,
    })),
  );
}

// Séances ------------------------------------------------------------------------

/**
 * Démarre une séance, vide ou depuis un modèle, et ouvre l'écran de saisie. Avec
 * `light`, une séance du programme démarre allégée (forme basse, charge en hausse).
 */
export async function startWorkout(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const templateId = id.safeParse(formData.get("templateId"));
  const supabase = await createClient();
  const today = localDate(profile.timezone);

  let name = "Séance libre";
  let items: PlannedItem[] = [];
  let program: { starts_on: string; deload_every: number } | null = null;
  if (templateId.success) {
    const { data: template } = await supabase
      .from("workout_templates")
      .select("name, programs(starts_on, deload_every, ended_on), template_items(exercise_id, position, sets, rep_min, rep_max, exercises(equipment, measure, primary_muscles))")
      .eq("id", templateId.data)
      .maybeSingle();
    if (template) {
      name = template.name;
      program = template.programs && template.programs.ended_on === null ? template.programs : null;
      items = [...template.template_items]
        .sort((a, b) => a.position - b.position)
        .map((i, order) => ({ exerciseId: i.exercise_id, order, sets: i.sets, repMin: i.rep_min, repMax: i.rep_max, exercise: i.exercises }));
    }
  }

  const light = formData.get("light") === "1" && program !== null;
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({ name, performed_on: today, template_id: templateId.success ? templateId.data : null, is_light: light })
    .select("id")
    .single();
  if (error || !workout) throw new Error("workout_not_created");

  if (items.length > 0) await supabase.from("workout_sets").insert(await plannedRows(workout.id, items, program, today, light));

  revalidatePath("/entrainement");
  redirect(`/entrainement/seance/${workout.id}`);
}

/** Ajoute un exercice en fin de séance, avec ses séries préremplies. */
export async function addExerciseToWorkout(workoutId: string, formData: FormData) {
  await requireUserId();
  const wid = id.parse(workoutId);
  const exerciseId = id.parse(formData.get("exerciseId"));
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("workout_sets")
    .select("exercise_order")
    .eq("workout_id", wid)
    .order("exercise_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const order = last ? last.exercise_order + 1 : 0;

  const { error } = await supabase.from("workout_sets").insert(await plannedRows(wid, [{ exerciseId, order }]));
  if (error) throw new Error("exercise_not_added");
  redirect(`/entrainement/seance/${wid}#exercice-${order}`);
}

const setSchema = z.object({
  id,
  workoutId: id,
  exerciseId: id,
  exerciseOrder: z.number().int().min(0).max(99),
  setNumber: z.number().int().min(1).max(50),
  weight: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  durationSeconds: z.number().int().min(0).max(86400).nullable(),
  repMin: z.number().int().min(1).max(100).nullable(),
  repMax: z.number().int().min(1).max(100).nullable(),
  isWarmup: z.boolean(),
  done: z.boolean(),
  /** Heure de validation sur le téléphone : la série peut arriver bien plus tard. */
  completedAt: z.iso.datetime({ offset: true }).nullable(),
});

export type SetInput = z.infer<typeof setSchema>;

/**
 * Réponse des enregistrements de séance. `retry` dit si un nouvel essai a une
 * chance d'aboutir (réseau, session expirée, panne passagère) ou si la saisie
 * est refusée pour de bon (valeur hors limites, règle de la base).
 */
export type SyncResult = { ok: true } | { ok: false; retry: boolean; error: string; reconnect?: boolean };

const SESSION_EXPIRED: SyncResult = {
  ok: false,
  retry: true,
  reconnect: true,
  error: "Ta session a expiré : tes séries attendent sur le téléphone et partiront une fois reconnecté.",
};

function syncError(error: { code?: string } | null): SyncResult {
  if (!error) return { ok: true };
  // Classes Postgres 22 (donnée invalide), 23 (contrainte) et 42 (droits, RLS) : rien ne changera en réessayant.
  const permanent = /^(22|23|42)/.test(error.code ?? "");
  return { ok: false, retry: !permanent, error: SAVE_ERROR };
}


/**
 * Enregistre une série (création ou mise à jour). L'identifiant vient du
 * téléphone : renvoyer deux fois la même série ne crée pas de doublon.
 */
export async function saveSet(input: SetInput): Promise<SyncResult> {
  if (!(await getUserId())) return SESSION_EXPIRED;
  const profile = await getProfile();
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, retry: false, error: "Ces valeurs sortent des limites possibles." };
  const s = parsed.data;
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").upsert({
    id: s.id,
    workout_id: s.workoutId,
    exercise_id: s.exerciseId,
    exercise_order: s.exerciseOrder,
    set_number: s.setNumber,
    weight_kg: s.weight === null ? null : Math.round(toKg(unit, s.weight) * 100) / 100,
    reps: s.reps,
    duration_seconds: s.durationSeconds,
    rep_min: s.repMin,
    rep_max: s.repMax,
    is_warmup: s.isWarmup,
    completed_at: s.done ? plausibleTime(s.completedAt, Date.now()) : null,
  });
  return syncError(error);
}

export async function deleteSet(setId: string): Promise<SyncResult> {
  if (!(await getUserId())) return SESSION_EXPIRED;
  const parsed = id.safeParse(setId);
  if (!parsed.success) return { ok: false, retry: false, error: SAVE_ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("id", parsed.data);
  return syncError(error);
}

export async function removeExerciseFromWorkout(workoutId: string, exerciseOrder: number): Promise<SyncResult> {
  if (!(await getUserId())) return SESSION_EXPIRED;
  const wid = id.safeParse(workoutId);
  const order = z.number().int().min(0).max(99).safeParse(exerciseOrder);
  if (!wid.success || !order.success) return { ok: false, retry: false, error: SAVE_ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("workout_id", wid.data).eq("exercise_order", order.data);
  return syncError(error);
}

/** Termine la séance : les séries non validées disparaissent ; une séance vide est supprimée. */
export async function finishWorkout(workoutId: string) {
  await requireUserId();
  const wid = id.parse(workoutId);
  const supabase = await createClient();
  await supabase.from("workout_sets").delete().eq("workout_id", wid).is("completed_at", null);
  const { count } = await supabase.from("workout_sets").select("id", { count: "exact", head: true }).eq("workout_id", wid);

  revalidatePath("/entrainement");
  if (!count) {
    await supabase.from("workouts").delete().eq("id", wid);
    redirect("/entrainement");
  }
  await supabase.from("workouts").update({ ended_at: new Date().toISOString() }).eq("id", wid).is("ended_at", null);
  redirect(`/entrainement/seance/${wid}`);
}

export async function deleteWorkout(workoutId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("workouts").delete().eq("id", id.parse(workoutId));
  revalidatePath("/entrainement");
  redirect("/entrainement/historique");
}

/** Crée un modèle à partir des exercices d'une séance terminée. */
export async function saveWorkoutAsTemplate(workoutId: string) {
  await requireUserId();
  const wid = id.parse(workoutId);
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from("workouts")
    .select("name, performed_on, workout_sets(exercise_id, exercise_order, reps, is_warmup, completed_at)")
    .eq("id", wid)
    .maybeSingle();
  if (!workout) redirect("/entrainement");

  const byOrder = new Map<number, { exerciseId: string; reps: number[] }>();
  for (const s of workout.workout_sets) {
    if (!s.completed_at || s.is_warmup) continue;
    const entry = byOrder.get(s.exercise_order) ?? { exerciseId: s.exercise_id, reps: [] };
    if (s.reps) entry.reps.push(s.reps);
    else entry.reps.push(0);
    byOrder.set(s.exercise_order, entry);
  }

  const name = workout.name === "Séance libre" ? `Modèle du ${formatShortDate(workout.performed_on)}` : workout.name;
  const { data: template } = await supabase.from("workout_templates").insert({ name }).select("id").single();
  if (!template) throw new Error("template_not_created");

  const items = [...byOrder.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, e], position) => {
      const reps = e.reps.filter((r) => r > 0);
      return {
        template_id: template.id,
        exercise_id: e.exerciseId,
        position,
        sets: Math.min(20, Math.max(1, e.reps.length)),
        rep_min: reps.length ? Math.min(...reps) : null,
        rep_max: reps.length ? Math.max(...reps) : null,
      };
    });
  if (items.length) await supabase.from("template_items").insert(items);
  redirect(`/entrainement/modeles/${template.id}`);
}

// Modèles ------------------------------------------------------------------------

const templateName = z.string().trim().min(1, "Donne un nom au modèle.").max(60, "60 caractères au maximum.");

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const name = templateName.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_templates").insert({ name: name.data }).select("id").single();
  if (error || !data) return { error: SAVE_ERROR };
  revalidatePath("/entrainement");
  redirect(`/entrainement/modeles/${data.id}`);
}

export async function renameTemplate(templateId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const name = templateName.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("workout_templates").update({ name: name.data }).eq("id", id.parse(templateId));
  if (error) return { error: SAVE_ERROR };
  revalidatePath(`/entrainement/modeles/${templateId}`);
  revalidatePath("/entrainement");
  return {};
}

export async function deleteTemplate(templateId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("workout_templates").delete().eq("id", id.parse(templateId));
  revalidatePath("/entrainement");
  redirect("/entrainement/modeles");
}

export async function addExerciseToTemplate(templateId: string, formData: FormData) {
  await requireUserId();
  const tid = id.parse(templateId);
  const exerciseId = id.parse(formData.get("exerciseId"));
  const supabase = await createClient();
  const [{ data: last }, { data: exercise }] = await Promise.all([
    supabase.from("template_items").select("position").eq("template_id", tid).order("position", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("exercises").select("measure").eq("id", exerciseId).maybeSingle(),
  ]);
  const timed = exercise?.measure === "duree";
  const { error } = await supabase.from("template_items").insert({
    template_id: tid,
    exercise_id: exerciseId,
    position: last ? last.position + 1 : 0,
    sets: 3,
    rep_min: timed ? null : 8,
    rep_max: timed ? null : 12,
  });
  if (error) throw new Error("item_not_added");
  revalidatePath("/entrainement");
  redirect(`/entrainement/modeles/${tid}`);
}

const itemSchema = z
  .object({
    sets: z.number().int().min(1).max(20),
    repMin: z.number().int().min(1).max(100).nullable(),
    repMax: z.number().int().min(1).max(100).nullable(),
  })
  .refine((v) => v.repMin === null || v.repMax === null || v.repMin <= v.repMax);

export async function updateTemplateItem(itemId: string, values: z.infer<typeof itemSchema>): Promise<{ ok: boolean }> {
  await requireUserId();
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_items")
    .update({ sets: parsed.data.sets, rep_min: parsed.data.repMin, rep_max: parsed.data.repMax })
    .eq("id", id.parse(itemId));
  revalidatePath("/entrainement");
  return { ok: !error };
}

export async function moveTemplateItem(templateId: string, itemId: string, direction: "up" | "down") {
  await requireUserId();
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("template_items")
    .select("id, position")
    .eq("template_id", id.parse(templateId))
    .order("position");
  if (!items) return;
  const index = items.findIndex((i) => i.id === itemId);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= items.length) return;
  // Positions renumérotées 0..n pour rester stables même après des suppressions.
  const order = items.map((i) => i.id);
  [order[index], order[swap]] = [order[swap], order[index]];
  await Promise.all(order.map((itemIdAt, position) => supabase.from("template_items").update({ position }).eq("id", itemIdAt)));
  revalidatePath(`/entrainement/modeles/${templateId}`);
}

export async function removeTemplateItem(templateId: string, itemId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("template_items").delete().eq("id", id.parse(itemId));
  revalidatePath(`/entrainement/modeles/${templateId}`);
  revalidatePath("/entrainement");
}

// Exercices ------------------------------------------------------------------------

const muscle = z.enum(Constants.public.Enums.muscle);
const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").max(60, "60 caractères au maximum."),
  primary: muscle,
  secondary: z.array(muscle).max(5, "5 muscles secondaires au maximum."),
  equipment: z.enum(Constants.public.Enums.equipment),
  measure: z.enum(Constants.public.Enums.exercise_measure),
});

/** Chemin de retour accepté seulement s'il reste dans l'onglet Entraînement. */
function safeReturn(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && /^\/entrainement(\/[a-z0-9-]+)*$/.test(value) ? value : null;
}

export async function createExercise(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    primary: formData.get("primary"),
    secondary: formData.getAll("secondary"),
    equipment: formData.get("equipment"),
    measure: formData.get("measure"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: v.name,
      primary_muscles: [v.primary],
      secondary_muscles: v.secondary.filter((m) => m !== v.primary),
      equipment: v.equipment,
      measure: v.measure,
    })
    .select("id")
    .single();
  if (error || !data) return { error: SAVE_ERROR };
  revalidatePath("/entrainement/exercices");
  redirect(safeReturn(formData.get("retour")) ?? `/entrainement/exercices/${data.id}`);
}

export async function archiveExercise(exerciseId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("exercises").update({ archived_at: new Date().toISOString() }).eq("id", id.parse(exerciseId));
  revalidatePath("/entrainement/exercices");
  redirect("/entrainement/exercices");
}
