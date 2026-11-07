"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { isValidBarcode, MEALS, type Meal } from "@/lib/engine";
import { dayHref, FOOD_COLUMNS, isDay, toFood } from "@/lib/nutrition";
import { MAX_PORTIONS, MAX_RECIPE_ITEMS, recipeRow } from "@/lib/recipes";
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
  // Code-barres venu du scan : gardé sur l'aliment pour le retrouver au scan suivant.
  const code = formData.get("barcode");
  const barcode = typeof code === "string" && isValidBarcode(code) ? code : null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...foodRow(parsed.data), barcode })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "Tu as déjà un aliment avec ce code-barres : retrouve-le dans Mes aliments.", values: foodValues(formData) };
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
    .eq("is_recipe", false)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: SAVE_ERROR, values: foodValues(formData) };
  await recomputeRecipes(supabase, data.id);
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/aliments");
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Un ingrédient corrigé : les recettes qui l'utilisent suivent, et les jours où elles sont notées aussi. */
async function recomputeRecipes(supabase: Supabase, foodId: string) {
  const { data: uses } = await supabase.from("recipe_items").select("recipe_id").eq("food_id", foodId);
  const recipeIds = [...new Set((uses ?? []).map((u) => u.recipe_id))];
  if (!recipeIds.length) return;
  const { data: recipes } = await supabase
    .from("foods")
    .select(`id, recipe_total_g, recipe_portions, recipe_items!recipe_items_recipe_id_user_id_fkey(grams, foods!recipe_items_food_id_fkey(${FOOD_COLUMNS}))`)
    .in("id", recipeIds)
    .eq("is_recipe", true);
  const now = new Date().toISOString();
  await Promise.all(
    (recipes ?? []).map(async (r) => {
      const items = r.recipe_items.flatMap((i) => (i.foods ? [{ grams: Number(i.grams), per100: toFood(i.foods).per100 }] : []));
      const result = recipeRow(items, r.recipe_total_g === null ? null : Number(r.recipe_total_g), r.recipe_portions ?? 1);
      // Hors limites (pesée douteuse) : la recette garde ses valeurs, l'écran de la recette le dira.
      if (result.ok) await supabase.from("foods").update({ ...result.row, updated_at: now }).eq("id", r.id);
    }),
  );
}

/** Retire un aliment des listes ; il reste dans les jours où il a été noté. */
export async function archiveFood(foodId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("foods").update({ archived_at: new Date().toISOString() }).eq("id", id.parse(foodId));
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/aliments");
}

// Recettes ------------------------------------------------------------------------

const recipeSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").max(80, "80 caractères au maximum."),
  portions: z
    .number({ error: "Indique le nombre de parts." })
    .int("Le nombre de parts est un nombre entier.")
    .min(1, "Une part au moins.")
    .max(MAX_PORTIONS, `${MAX_PORTIONS} parts au maximum.`),
  cookedG: z
    .number({ error: "Le poids cuit est un nombre de grammes, ou laisse vide." })
    .gt(0, "Le poids cuit doit être positif.")
    .max(50000, "50 kg au maximum pour le plat entier.")
    .nullable(),
  items: z
    .array(
      z.object({
        foodId: id,
        grams: z
          .number({ error: "Indique le poids de chaque ingrédient." })
          .gt(0, "Chaque ingrédient doit peser plus de 0 g.")
          .max(10000, "10 kg au maximum par ingrédient."),
      }),
    )
    .min(1, "Ajoute au moins un ingrédient.")
    .max(MAX_RECIPE_ITEMS, `${MAX_RECIPE_ITEMS} ingrédients au maximum.`),
});

function readItems(value: FormDataEntryValue | null): unknown {
  try {
    const list = JSON.parse(typeof value === "string" ? value : "[]");
    return Array.isArray(list) ? list.map((i) => ({ foodId: i?.foodId, grams: typeof i?.grams === "number" ? i.grams : decimal(typeof i?.grams === "string" ? i.grams : null) })) : [];
  } catch {
    return [];
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Crée ou modifie une recette : les valeurs pour 100 g et la part sont recalculées
 * ici depuis les ingrédients relus en base, jamais reprises du navigateur.
 */
export async function saveRecipe(recipeId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUserId();
  if (recipeId !== null) id.parse(recipeId);
  const parsed = recipeSchema.safeParse({
    name: typeof formData.get("name") === "string" ? formData.get("name") : "",
    portions: decimal(formData.get("portions")),
    cookedG: decimal(formData.get("cookedG")),
    items: readItems(formData.get("items")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const foodIds = [...new Set(v.items.map((i) => i.foodId))];
  const { data: rows } = await supabase.from("foods").select(FOOD_COLUMNS).in("id", foodIds);
  const foods = new Map((rows ?? []).map((r) => [r.id, toFood(r)]));
  // Pas de recette dans une recette : cela évite les boucles et les recalculs en chaîne.
  if (foodIds.some((f) => !foods.has(f) || foods.get(f)!.recipe || f === recipeId)) {
    return { error: "Un ingrédient n'est plus disponible ou est lui-même une recette : retire-le et réessaie." };
  }
  const result = recipeRow(
    v.items.map((i) => ({ grams: i.grams, per100: foods.get(i.foodId)!.per100 })),
    v.cookedG,
    v.portions,
  );
  if (!result.ok) return { error: result.error };
  const items = (recipe: string) => v.items.map((i, position) => ({ recipe_id: recipe, food_id: i.foodId, grams: round1(i.grams), position }));

  if (recipeId === null) {
    const { data: recipe, error } = await supabase
      .from("foods")
      .insert({ name: v.name, ...result.row, is_recipe: true })
      .select("id")
      .single();
    if (error || !recipe) return { error: SAVE_ERROR };
    const { error: itemsError } = await supabase.from("recipe_items").insert(items(recipe.id));
    if (itemsError) {
      // Pas de recette vide : on retire celle qui vient d'être créée.
      await supabase.from("foods").delete().eq("id", recipe.id);
      return { error: SAVE_ERROR };
    }
  } else {
    // Nouveaux ingrédients d'abord, anciens retirés à la fin : un échec en route ne vide jamais la recette.
    const { data: old } = await supabase.from("recipe_items").select("id").eq("recipe_id", recipeId);
    const { data: added, error: itemsError } = await supabase.from("recipe_items").insert(items(recipeId)).select("id");
    if (itemsError || !added) return { error: SAVE_ERROR };
    const { data: updated, error } = await supabase
      .from("foods")
      .update({ name: v.name, ...result.row, updated_at: new Date().toISOString() })
      .eq("id", recipeId)
      .eq("is_recipe", true)
      .select("id")
      .maybeSingle();
    if (error || !updated) {
      await supabase.from("recipe_items").delete().in("id", added.map((a) => a.id));
      return { error: SAVE_ERROR };
    }
    if (old?.length) await supabase.from("recipe_items").delete().in("id", old.map((o) => o.id));
  }
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/recettes");
}

/** Retire une recette des listes ; elle reste dans les jours où elle a été notée. */
export async function archiveRecipe(recipeId: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("foods").update({ archived_at: new Date().toISOString() }).eq("id", id.parse(recipeId)).eq("is_recipe", true);
  revalidatePath("/nutrition", "layout");
  redirect("/nutrition/recettes");
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
