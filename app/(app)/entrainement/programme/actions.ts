"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { buildProgram, splitFor, toKg } from "@/lib/engine";
import { MAX_PRIORITY_MUSCLES, programName } from "@/lib/program";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryGoal } from "../../weight-data";
import { getCatalog, getPreferences, getUsage, splitPreferences } from "./data";

export type FormState = { error?: string; values?: Record<string, string> };

const id = z.uuid();
const SAVE_ERROR = "Le programme n'a pas été enregistré. Vérifie ta connexion et réessaie.";

const decimal = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v.replace(/\s/g, "").replace(",", "."))));

const programSchema = z.object({
  sessions: z.coerce.number().int().min(2).max(6),
  minutes: z.coerce.number().int().min(30).max(120),
  weeks: z.coerce.number().int().min(4).max(24),
  equipment: z.array(z.enum(Constants.public.Enums.equipment)).min(1),
  priority: z.array(z.enum(Constants.public.Enums.muscle)).max(MAX_PRIORITY_MUSCLES),
  goalExercise: z.union([z.literal(""), id]),
  goalKg: decimal,
  goalDate: z.union([z.literal(""), z.iso.date()]),
});

const FIELD_ERRORS: Record<string, string> = {
  sessions: "Choisis le nombre de séances par semaine.",
  minutes: "Choisis la durée d'une séance.",
  weeks: "Choisis la durée du programme.",
  equipment: "Coche au moins un matériel.",
  priority: `${MAX_PRIORITY_MUSCLES} muscles prioritaires au plus.`,
  goalExercise: "Choisis l'exercice de l'objectif.",
  goalDate: "La date visée n'est pas valide.",
};

function echo(formData: FormData): Record<string, string> {
  return {
    sessions: String(formData.get("sessions") ?? ""),
    minutes: String(formData.get("minutes") ?? ""),
    weeks: String(formData.get("weeks") ?? ""),
    equipment: formData.getAll("equipment").join(","),
    priority: formData.getAll("priority").join(","),
    goalExercise: String(formData.get("goalExercise") ?? ""),
    goalKg: String(formData.get("goalKg") ?? ""),
    goalDate: String(formData.get("goalDate") ?? ""),
  };
}

/**
 * Crée le programme et ses séances (des modèles rattachés au programme), générés
 * d'après les réglages, les préférences d'exercices et les habitudes.
 */
export async function createProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const values = echo(formData);
  const parsed = programSchema.safeParse({
    sessions: formData.get("sessions"),
    minutes: formData.get("minutes"),
    weeks: formData.get("weeks"),
    equipment: formData.getAll("equipment"),
    priority: formData.getAll("priority"),
    goalExercise: formData.get("goalExercise") ?? "",
    goalKg: String(formData.get("goalKg") ?? ""),
    goalDate: formData.get("goalDate") ?? "",
  });
  if (!parsed.success) return { error: FIELD_ERRORS[String(parsed.error.issues[0].path[0])] ?? "Vérifie les réglages du programme.", values };
  const p = parsed.data;
  const today = localDate(profile.timezone);
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";

  const goalExerciseId = p.goalExercise || null;
  if ((goalExerciseId === null) !== (p.goalKg === null)) return { error: "Pour un objectif chiffré, choisis l'exercice et la charge visée.", values };
  if (p.goalKg !== null && (!Number.isFinite(p.goalKg) || p.goalKg <= 0 || p.goalKg > 1000)) return { error: "La charge visée doit être un nombre, par exemple 100 ou 102,5.", values };
  if (p.goalDate && p.goalDate <= today) return { error: "La date visée doit être dans le futur.", values };
  const goalKg = p.goalKg === null ? null : Math.round(toKg(unit, p.goalKg) * 10) / 10;

  const [catalog, prefs, usage, goal] = await Promise.all([getCatalog(), getPreferences(), getUsage(addDays(today, -180)), getPrimaryGoal(profile.user_id)]);
  if (goalExerciseId && !catalog.some((e) => e.id === goalExerciseId && e.measure === "charge")) return { error: "Choisis un exercice avec charge pour l'objectif.", values };
  const { liked, avoided } = splitPreferences(prefs);
  const sessions = buildProgram(catalog, {
    sessionsPerWeek: p.sessions,
    sessionMinutes: p.minutes,
    equipment: p.equipment,
    priority: p.priority,
    strength: goal?.type === "force",
    liked,
    avoided,
    usage,
    goalExerciseId,
  });
  if (sessions.some((s) => s.items.length === 0)) return { error: "Pas assez d'exercices avec ce matériel. Coche plus de matériel ou retire des exercices à éviter.", values };

  const supabase = await createClient();
  const { data: program, error } = await supabase
    .from("programs")
    .insert({
      name: programName(splitFor(p.sessions, p.priority)),
      starts_on: today,
      weeks: p.weeks,
      sessions_per_week: p.sessions,
      session_minutes: p.minutes,
      equipment: p.equipment,
      priority_muscles: p.priority,
      goal_exercise_id: goalExerciseId,
      goal_kg: goalKg,
      goal_date: p.goalDate || null,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "Tu as déjà un programme en cours : termine-le avant d'en créer un autre.", values };
  if (error || !program) return { error: SAVE_ERROR, values };

  const { data: templates, error: templatesError } = await supabase
    .from("workout_templates")
    .insert(sessions.map((s, position) => ({ name: s.name, position, program_id: program.id })))
    .select("id, position");
  const items = (templates ?? []).flatMap((t) =>
    sessions[t.position].items.map((it, position) => ({
      template_id: t.id,
      exercise_id: it.exerciseId,
      position,
      sets: it.sets,
      rep_min: it.repMin,
      rep_max: it.repMax,
    })),
  );
  const { error: itemsError } = templatesError ? { error: templatesError } : await supabase.from("template_items").insert(items);
  if (itemsError) {
    // Rien à moitié : le programme part avec ses séances (suppression en cascade).
    await supabase.from("programs").delete().eq("id", program.id);
    return { error: SAVE_ERROR, values };
  }

  revalidatePath("/entrainement");
  redirect("/entrainement/programme");
}

/** Termine le programme : ses séances restent dans les modèles, sans charge suggérée. */
export async function endProgram(programId: string) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const supabase = await createClient();
  await supabase.from("programs").update({ ended_on: localDate(profile.timezone) }).eq("id", id.parse(programId)).is("ended_on", null);
  revalidatePath("/entrainement");
  redirect("/entrainement/programme");
}

/** Remplace un exercice d'une séance du programme, et l'écarte des prochains programmes si demandé. */
export async function replaceProgramItem(itemId: string, formData: FormData) {
  const userId = await requireUserId();
  const iid = id.parse(itemId);
  const exerciseId = id.parse(formData.get("exerciseId"));
  const supabase = await createClient();
  const { data: item } = await supabase.from("template_items").select("exercise_id").eq("id", iid).eq("user_id", userId).maybeSingle();
  if (!item) redirect("/entrainement/programme");
  const { error } = await supabase.from("template_items").update({ exercise_id: exerciseId }).eq("id", iid);
  if (error) throw new Error("item_not_replaced");
  if (formData.get("avoid") === "on") {
    await supabase.from("exercise_preferences").upsert({ exercise_id: item.exercise_id, preference: "evite" }, { onConflict: "user_id,exercise_id" });
  }
  revalidatePath("/entrainement");
  redirect("/entrainement/programme#seances");
}

const preferenceSchema = z.union([z.enum(Constants.public.Enums.exercise_preference), z.literal("")]);

/** J'aime, à éviter, ou sans avis (la ligne est retirée). */
export async function setExercisePreference(exerciseId: string, formData: FormData) {
  await requireUserId();
  const eid = id.parse(exerciseId);
  const preference = preferenceSchema.parse(formData.get("preference") ?? "");
  const supabase = await createClient();
  if (preference === "") await supabase.from("exercise_preferences").delete().eq("exercise_id", eid);
  else await supabase.from("exercise_preferences").upsert({ exercise_id: eid, preference }, { onConflict: "user_id,exercise_id" });
  revalidatePath(`/entrainement/exercices/${eid}`);
}
