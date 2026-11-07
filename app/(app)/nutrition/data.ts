import "server-only";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { dayTypeFor, frequentFoods, nutrientsFor, sumNutrients, type DayType, type Meal, type Nutrients } from "@/lib/engine";
import { FOOD_COLUMNS, toFood, type Food, type JournalEntry, type Target } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

/** Catalogue commun et aliments personnels non archivés, par ordre alphabétique. */
export async function getFoods(): Promise<Food[]> {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).is("archived_at", null).order("name");
  return (data ?? []).map(toFood);
}

export async function getFood(id: string): Promise<Food> {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  return toFood(data);
}

/** Ce qui a été noté un jour donné, dans l'ordre de saisie. */
export async function getDayLogs(day: string): Promise<JournalEntry[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select(`id, meal, grams, created_at, foods(${FOOD_COLUMNS})`)
    .eq("user_id", userId)
    .eq("eaten_on", day)
    .order("created_at");
  return (data ?? []).flatMap((row) => {
    if (!row.foods) return [];
    const food = toFood(row.foods);
    const grams = Number(row.grams);
    return [{ id: row.id, meal: row.meal, grams, food, nutrients: nutrientsFor(food.per100, grams) }];
  });
}

export async function getLog(id: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select(`id, meal, grams, eaten_on, foods(${FOOD_COLUMNS})`)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.foods) notFound();
  return { id: data.id, meal: data.meal, grams: Number(data.grams), day: data.eaten_on, food: toFood(data.foods) };
}

/** Aliments les plus notés ces 30 derniers jours, avec la dernière quantité. */
export async function getFrequentFoods(today: string, limit = 8) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select(`food_id, grams, created_at, foods(${FOOD_COLUMNS}, archived_at)`)
    .eq("user_id", userId)
    .gte("eaten_on", addDays(today, -30))
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []).filter((r) => r.foods && !r.foods.archived_at);
  const foods = new Map(rows.map((r) => [r.food_id, toFood(r.foods!)]));
  return frequentFoods(rows.map((r) => ({ foodId: r.food_id, grams: Number(r.grams), at: r.created_at })), limit).map((f) => ({
    food: foods.get(f.foodId)!,
    grams: f.lastGrams,
  }));
}

/** Dernière quantité notée pour un aliment, pour préremplir. */
export async function getLastGrams(foodId: string): Promise<number | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select("grams")
    .eq("user_id", userId)
    .eq("food_id", foodId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.grams) : null;
}

export async function getTargets(): Promise<Partial<Record<DayType, Target>>> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("nutrition_targets").select("day_type, kcal, protein_g, carbs_g, fat_g").eq("user_id", userId);
  return Object.fromEntries(
    (data ?? []).map((t) => [t.day_type, { kcal: t.kcal, proteinG: t.protein_g, carbsG: t.carbs_g, fatG: t.fat_g }]),
  );
}

/** Type du jour : jour habituel d'entraînement ou séance enregistrée ce jour-là. */
export async function getDayType(day: string, trainingDays: readonly number[]): Promise<DayType> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("performed_on", day);
  return dayTypeFor(day, trainingDays, (count ?? 0) > 0);
}

export type SavedMeal = { id: string; name: string; meal: Meal; items: { food: Food; grams: number }[]; totals: Nutrients };

export async function getSavedMeals(): Promise<SavedMeal[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_meals")
    .select(`id, name, meal, position, saved_meal_items(grams, position, foods(${FOOD_COLUMNS}))`)
    .eq("user_id", userId)
    .order("position")
    .order("created_at");
  return (data ?? []).map((m) => {
    const items = [...m.saved_meal_items]
      .sort((a, b) => a.position - b.position)
      .flatMap((i) => (i.foods ? [{ food: toFood(i.foods), grams: Number(i.grams) }] : []));
    return { id: m.id, name: m.name, meal: m.meal, items, totals: sumNutrients(items.map((i) => nutrientsFor(i.food.per100, i.grams))) };
  });
}

/** Aliments créés par l'utilisateur, non archivés ; les recettes ont leur propre liste. */
export async function getPersonalFoods(): Promise<Food[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("user_id", userId).eq("is_recipe", false).is("archived_at", null).order("name");
  return (data ?? []).map(toFood);
}

/** Ingrédients possibles d'une recette : tout aliment non archivé, sauf les recettes. */
export async function getIngredients(): Promise<Food[]> {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("is_recipe", false).is("archived_at", null).order("name");
  return (data ?? []).map(toFood);
}

export type RecipeSummary = { food: Food; portions: number };

export async function getRecipes(): Promise<RecipeSummary[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("foods")
    .select(`${FOOD_COLUMNS}, recipe_portions`)
    .eq("user_id", userId)
    .eq("is_recipe", true)
    .is("archived_at", null)
    .order("name");
  return (data ?? []).map((r) => ({ food: toFood(r), portions: r.recipe_portions ?? 1 }));
}

export type Recipe = { food: Food; cookedG: number | null; portions: number; items: { food: Food; grams: number }[] };

/** Une recette et ses ingrédients, dans l'ordre de saisie. */
export async function getRecipe(id: string): Promise<Recipe> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("foods")
    .select(
      `${FOOD_COLUMNS}, recipe_total_g, recipe_portions, recipe_items!recipe_items_recipe_id_user_id_fkey(grams, position, foods!recipe_items_food_id_fkey(${FOOD_COLUMNS}))`,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_recipe", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!data) notFound();
  const items = [...data.recipe_items]
    .sort((a, b) => a.position - b.position)
    .flatMap((i) => (i.foods ? [{ food: toFood(i.foods), grams: Number(i.grams) }] : []));
  return {
    food: toFood(data),
    cookedG: data.recipe_total_g === null ? null : Number(data.recipe_total_g),
    portions: data.recipe_portions ?? 1,
    items,
  };
}

/** Dernière pesée, pour la cible suggérée. */
export async function getLatestWeightKg(): Promise<number | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_weights")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("measured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.weight_kg) : null;
}
