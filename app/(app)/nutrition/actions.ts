"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { MEALS, type Meal } from "@/lib/engine";
import { dayHref, isDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

/** `values` renvoie la saisie quand elle est refusée : le formulaire la garde au lieu de se vider. */
export type FormState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";
const id = z.uuid();
const meal = z.enum(MEALS, { error: "Choisis un repas." });

/** Nombre saisi au clavier français (« 12,5 », « 2 600 ») ; vide devient null. */
function decimal(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

const grams = z.number({ error: "Indique une quantité en grammes." }).gt(0, "La quantité doit être positive.").max(5000, "5 000 g au maximum.");

/** Jour local de l'utilisateur, et le jour visé : jamais dans le futur, au plus deux ans en arrière. */
async function days(value: FormDataEntryValue | null) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const today = localDate(profile.timezone);
  if (value === null || value === "") return { today, day: today };
  if (!isDay(value) || value > today || value < addDays(today, -730)) throw new Error("invalid_day");
  return { today, day: value };
}

function done(day: string, today: string, m?: Meal): never {
  revalidatePath("/nutrition");
  revalidatePath("/");
  redirect(dayHref(day, today, m));
}

// Journal ------------------------------------------------------------------------

async function insertLog(formData: FormData): Promise<FormState & { day?: string; today?: string; meal?: Meal }> {
  await requireUserId();
  const { today, day } = await days(formData.get("day"));
  const parsed = z
    .object({ foodId: id, meal, grams })
    .safeParse({ foodId: formData.get("foodId"), meal: formData.get("meal"), grams: decimal(formData.get("grams")) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("food_logs")
    .insert({ food_id: parsed.data.foodId, eaten_on: day, meal: parsed.data.meal, grams: Math.round(parsed.data.grams * 10) / 10 });
  if (error) return { error: SAVE_ERROR };
  return { day, today, meal: parsed.data.meal };
}

/** Écran de quantité : ajoute l'aliment et revient au jour. */
export async function addFoodLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await insertLog(formData);
  if (result.error) return { error: result.error };
  done(result.day!, result.today!, result.meal);
}

/** Aliment fréquent : un tap, avec la dernière quantité. */
export async function quickLog(formData: FormData) {
  const result = await insertLog(formData);
  if (result.error) throw new Error("food_not_logged");
  done(result.day!, result.today!, result.meal);
}

export async function updateFoodLog(logId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = z
    .object({ id, meal, grams })
    .safeParse({ id: logId, meal: formData.get("meal"), grams: decimal(formData.get("grams")) });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_logs")
    .update({ meal: parsed.data.meal, grams: Math.round(parsed.data.grams * 10) / 10, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("eaten_on")
    .maybeSingle();
  if (error || !data) return { error: SAVE_ERROR };
  const { today } = await days(null);
  done(data.eaten_on, today, parsed.data.meal);
}

export async function deleteFoodLog(logId: string) {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("food_logs").delete().eq("id", id.parse(logId)).select("eaten_on, meal").maybeSingle();
  const { today } = await days(null);
  done(data?.eaten_on ?? today, today, data?.meal);
}

/** « Comme hier » : recopie un repas d'un autre jour sur le jour affiché. */
export async function copyMeal(formData: FormData) {
  await requireUserId();
  const { today, day } = await days(formData.get("day"));
  const m = meal.parse(formData.get("meal"));
  const from = z.string().refine(isDay).parse(formData.get("from"));
  const supabase = await createClient();
  const { data: source } = await supabase.from("food_logs").select("food_id, grams").eq("eaten_on", from).eq("meal", m).order("created_at");
  if (source?.length) {
    const { error } = await supabase.from("food_logs").insert(source.map((s) => ({ food_id: s.food_id, grams: s.grams, eaten_on: day, meal: m })));
    if (error) throw new Error("meal_not_copied");
  }
  done(day, today, m);
}

// Repas favoris ------------------------------------------------------------------------

/** Ajoute tout un repas favori au jour et au repas choisis. */
export async function logSavedMeal(formData: FormData) {
  await requireUserId();
  const { today, day } = await days(formData.get("day"));
  const m = meal.parse(formData.get("meal"));
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("saved_meal_items")
    .select("food_id, grams, position")
    .eq("saved_meal_id", id.parse(formData.get("savedMealId")))
    .order("position");
  if (items?.length) {
    const { error } = await supabase.from("food_logs").insert(items.map((i) => ({ food_id: i.food_id, grams: i.grams, eaten_on: day, meal: m })));
    if (error) throw new Error("saved_meal_not_logged");
  }
  done(day, today, m);
}

const favoriteName = z.string().trim().min(1, "Donne un nom au repas.").max(40, "40 caractères au maximum.");

/** Enregistre un repas du journal comme favori. */
export async function saveMealAsFavorite(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const { day } = await days(formData.get("day"));
  const name = favoriteName.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message, values: { name: String(formData.get("name") ?? "") } };
  const m = meal.parse(formData.get("meal"));
  const supabase = await createClient();
  const { data: logs } = await supabase.from("food_logs").select("food_id, grams").eq("eaten_on", day).eq("meal", m).order("created_at");
  if (!logs?.length) return { error: "Ce repas est vide : ajoute d'abord des aliments." };

  const { data: saved, error } = await supabase.from("saved_meals").insert({ name: name.data, meal: m }).select("id").single();
  if (error || !saved) return { error: SAVE_ERROR };
  const { error: itemsError } = await supabase
    .from("saved_meal_items")
    .insert(logs.map((l, position) => ({ saved_meal_id: saved.id, food_id: l.food_id, grams: l.grams, position })));
  if (itemsError) {
    // Pas de favori vide : on retire celui qui vient d'être créé.
    await supabase.from("saved_meals").delete().eq("id", saved.id);
    return { error: SAVE_ERROR };
  }
  revalidatePath("/nutrition");
  redirect("/nutrition/favoris");
}

export async function deleteSavedMeal(savedMealId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("saved_meals").delete().eq("id", id.parse(savedMealId));
  revalidatePath("/nutrition");
  redirect("/nutrition/favoris");
}

// Aliments personnels ------------------------------------------------------------------------

const macro = (label: string) =>
  z.number({ error: `Indique les ${label} pour 100 g (0 si aucun).` }).min(0, `Les ${label} ne peuvent pas être négatifs.`).max(100, `Les ${label} ne dépassent pas 100 g pour 100 g.`);

const foodSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").max(80, "80 caractères au maximum."),
    brand: z.string().trim().max(60, "60 caractères au maximum pour la marque.").transform((v) => v || null),
    kcal: z.number({ error: "Indique les calories pour 100 g." }).min(0, "Les calories ne peuvent pas être négatives.").max(900, "900 kcal au maximum pour 100 g."),
    proteinG: macro("protéines"),
    carbsG: macro("glucides"),
    fatG: macro("lipides"),
    portionLabel: z.string().trim().max(40, "40 caractères au maximum pour la portion.").transform((v) => v || null),
    portionG: z.number({ error: "Indique le poids de la portion en grammes." }).gt(0, "La portion doit peser plus de 0 g.").max(2000, "2 000 g au maximum pour une portion.").nullable(),
  })
  .refine((v) => v.proteinG + v.carbsG + v.fatG <= 100, { message: "Protéines, glucides et lipides ensemble ne dépassent pas 100 g pour 100 g." })
  .refine((v) => (v.portionLabel === null) === (v.portionG === null), { message: "Pour une portion, indique son nom et son poids, ou laisse les deux vides." });

const FOOD_FIELDS = ["name", "brand", "kcal", "proteinG", "carbsG", "fatG", "portionLabel", "portionG"] as const;

function foodValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(FOOD_FIELDS.map((k) => [k, typeof formData.get(k) === "string" ? (formData.get(k) as string) : ""]));
}

function readFood(formData: FormData) {
  const text = (key: string) => (typeof formData.get(key) === "string" ? (formData.get(key) as string) : "");
  return foodSchema.safeParse({
    name: text("name"),
    brand: text("brand"),
    kcal: decimal(formData.get("kcal")),
    proteinG: decimal(formData.get("proteinG")),
    carbsG: decimal(formData.get("carbsG")),
    fatG: decimal(formData.get("fatG")),
    portionLabel: text("portionLabel"),
    portionG: decimal(formData.get("portionG")),
  });
}

function foodRow(v: z.infer<typeof foodSchema>) {
  return {
    name: v.name,
    brand: v.brand,
    kcal: v.kcal,
    protein_g: v.proteinG,
    carbs_g: v.carbsG,
    fat_g: v.fatG,
    portion_label: v.portionLabel,
    portion_g: v.portionG,
  };
}

/** Crée un aliment personnel ; venu de l'ajout d'un repas, on enchaîne sur la quantité. */
export async function createFood(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = readFood(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: foodValues(formData) };
  const supabase = await createClient();
  const { data, error } = await supabase.from("foods").insert(foodRow(parsed.data)).select("id").single();
  if (error || !data) return { error: SAVE_ERROR, values: foodValues(formData) };
  revalidatePath("/nutrition");
  const m = meal.safeParse(formData.get("meal"));
  const day = formData.get("day");
  if (m.success) {
    const params = new URLSearchParams({ repas: m.data });
    if (isDay(day)) params.set("jour", day);
    redirect(`/nutrition/ajouter/${data.id}?${params}`);
  }
  redirect("/nutrition/aliments");
}

/** Corrige un aliment personnel : les jours passés suivent, les totaux se calculant à la lecture. */
export async function updateFood(foodId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = readFood(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: foodValues(formData) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .update({ ...foodRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id.parse(foodId))
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: SAVE_ERROR, values: foodValues(formData) };
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/aliments");
}

/** Retire un aliment des listes ; il reste dans les jours où il a été noté. */
export async function archiveFood(foodId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("foods").update({ archived_at: new Date().toISOString() }).eq("id", id.parse(foodId));
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/aliments");
}

// Cibles ------------------------------------------------------------------------

const target = (prefix: string) => {
  const optional = (label: string, max: number) =>
    z
      .number({ error: `${label} du ${prefix} : un nombre entier, ou laisse vide.` })
      .int(`${label} du ${prefix} : un nombre entier.`)
      .min(0, `${label} du ${prefix} : pas de valeur négative.`)
      .max(max, `${label} du ${prefix} : ${max.toLocaleString("fr-FR")} g au maximum.`)
      .nullable();
  return z.object({
    kcal: z
      .number({ error: `Indique les calories du ${prefix}.` })
      .int(`Calories du ${prefix} : un nombre entier.`)
      .min(800, `Calories du ${prefix} : 800 kcal au minimum.`)
      .max(8000, `Calories du ${prefix} : 8 000 kcal au maximum.`),
    proteinG: z
      .number({ error: `Indique les protéines du ${prefix}.` })
      .int(`Protéines du ${prefix} : un nombre entier.`)
      .min(0, `Protéines du ${prefix} : pas de valeur négative.`)
      .max(500, `Protéines du ${prefix} : 500 g au maximum.`),
    carbsG: optional("Glucides", 1500),
    fatG: optional("Lipides", 500),
  });
};

const targetsSchema = z.object({
  trainingDays: z.array(z.number().int().min(1).max(7)).max(7),
  entrainement: target("jour d'entraînement"),
  repos: target("jour de repos"),
});

export async function saveTargets(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const read = (dayType: string) => ({
    kcal: decimal(formData.get(`${dayType}.kcal`)),
    proteinG: decimal(formData.get(`${dayType}.proteinG`)),
    carbsG: decimal(formData.get(`${dayType}.carbsG`)),
    fatG: decimal(formData.get(`${dayType}.fatG`)),
  });
  const parsed = targetsSchema.safeParse({
    trainingDays: formData.getAll("trainingDays").map(Number),
    entrainement: read("entrainement"),
    repos: read("repos"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [targets, profile] = await Promise.all([
    supabase.from("nutrition_targets").upsert(
      (["entrainement", "repos"] as const).map((dayType) => ({
        user_id: userId,
        day_type: dayType,
        kcal: v[dayType].kcal,
        protein_g: v[dayType].proteinG,
        carbs_g: v[dayType].carbsG,
        fat_g: v[dayType].fatG,
        updated_at: now,
      })),
      { onConflict: "user_id,day_type" },
    ),
    supabase
      .from("profiles")
      .update({ training_days: [...new Set(v.trainingDays)].sort() })
      .eq("user_id", userId),
  ]);
  if (targets.error || profile.error) return { error: SAVE_ERROR };
  revalidatePath("/nutrition", "layout");
  revalidatePath("/");
  redirect("/nutrition");
}
