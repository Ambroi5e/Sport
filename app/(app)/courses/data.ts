import "server-only";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { ingredientsEaten, purchaseGrams, type FoodAmount, type RecipeParts } from "@/lib/engine";
import { MEAL_DAYS, type MealNeed, type Purchase, type ShoppingItem } from "@/lib/groceries";
import { createClient } from "@/lib/supabase/server";

/** Prix au kilo saisis, par aliment. */
export async function getPrices(): Promise<Map<string, number>> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("food_prices").select("food_id, price_per_kg").eq("user_id", userId);
  return new Map((data ?? []).map((p) => [p.food_id, Number(p.price_per_kg)]));
}

const ITEM_COLUMNS = "id, name, quantity, aisle, food_id, grams, checked_at";

type ItemRow = { id: string; name: string; quantity: string | null; aisle: ShoppingItem["aisle"]; food_id: string | null; grams: number | null; checked_at: string | null };

function toItem(row: ItemRow, prices: ReadonlyMap<string, number>): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    aisle: row.aisle,
    checked: row.checked_at !== null,
    foodId: row.food_id,
    grams: row.grams === null ? null : Number(row.grams),
    pricePerKg: row.food_id ? (prices.get(row.food_id) ?? null) : null,
  };
}

/** La liste de courses, dans l'ordre d'ajout, avec le prix au kilo quand il est connu. */
export async function getShoppingList(): Promise<ShoppingItem[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data }, prices] = await Promise.all([
    supabase.from("shopping_items").select(ITEM_COLUMNS).eq("user_id", userId).order("created_at").order("id"),
    getPrices(),
  ]);
  return (data ?? []).map((row) => toItem(row, prices));
}

export async function getShoppingItem(id: string): Promise<ShoppingItem> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("shopping_items").select(ITEM_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) notFound();
  return toItem(data, new Map());
}

export type Eaten = {
  /** Aliments à acheter, recettes dépliées, du plus lourd au plus léger. */
  ingredients: (FoodAmount & { name: string; kcal: number })[];
  /** Jours avec au moins une ligne de journal. */
  days: number;
};

/**
 * Ce qui a été mangé sur les `MEAL_DAYS` derniers jours, ramené aux aliments à
 * acheter : une recette est dépliée en ses ingrédients.
 */
export async function getEaten(today: string): Promise<Eaten> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("food_logs")
    .select("eaten_on, grams, foods(id, name, kcal, is_recipe, recipe_total_g)")
    .eq("user_id", userId)
    .gte("eaten_on", addDays(today, 1 - MEAL_DAYS))
    .lte("eaten_on", today);

  const foods = new Map<string, { name: string; kcal: number }>();
  const eaten: FoodAmount[] = [];
  const recipeTotals = new Map<string, number | null>();
  const days = new Set<string>();
  for (const log of logs ?? []) {
    if (!log.foods) continue;
    days.add(log.eaten_on);
    foods.set(log.foods.id, { name: log.foods.name, kcal: Number(log.foods.kcal) });
    eaten.push({ foodId: log.foods.id, grams: Number(log.grams) });
    if (log.foods.is_recipe) recipeTotals.set(log.foods.id, log.foods.recipe_total_g === null ? null : Number(log.foods.recipe_total_g));
  }

  const recipes = new Map<string, RecipeParts>();
  if (recipeTotals.size) {
    const { data: items } = await supabase
      .from("recipe_items")
      .select("recipe_id, grams, foods!recipe_items_food_id_fkey(id, name, kcal)")
      .eq("user_id", userId)
      .in("recipe_id", [...recipeTotals.keys()]);
    const byRecipe = new Map<string, FoodAmount[]>();
    for (const item of items ?? []) {
      if (!item.foods) continue;
      foods.set(item.foods.id, { name: item.foods.name, kcal: Number(item.foods.kcal) });
      byRecipe.set(item.recipe_id, [...(byRecipe.get(item.recipe_id) ?? []), { foodId: item.foods.id, grams: Number(item.grams) }]);
    }
    for (const [id, parts] of byRecipe) {
      // Sans poids cuit pesé, le plat pèse la somme de ses ingrédients.
      recipes.set(id, { totalG: recipeTotals.get(id) ?? parts.reduce((sum, p) => sum + p.grams, 0), items: parts });
    }
  }

  return {
    days: days.size,
    ingredients: ingredientsEaten(eaten, recipes).flatMap((e) => {
      const food = foods.get(e.foodId);
      return food ? [{ ...e, name: food.name, kcal: (food.kcal * e.grams) / 100 }] : [];
    }),
  };
}

/** Ce qu'il faudrait racheter pour une semaine comme la dernière, arrondi à une quantité d'achat. */
export function mealNeeds(eaten: Eaten, prices: ReadonlyMap<string, number>, list: readonly ShoppingItem[]): MealNeed[] {
  const waiting = new Set(list.filter((i) => !i.checked && i.foodId).map((i) => i.foodId));
  return eaten.ingredients.map((e) => ({
    foodId: e.foodId,
    name: e.name,
    grams: e.grams,
    buyGrams: purchaseGrams(e.grams),
    pricePerKg: prices.get(e.foodId) ?? null,
    inList: waiting.has(e.foodId),
  }));
}

/** Achats notés depuis une date, du plus récent au plus ancien. */
export async function getPurchases(from: string): Promise<Purchase[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, purchased_on, amount, store")
    .eq("user_id", userId)
    .gte("purchased_on", from)
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ id: p.id, on: p.purchased_on, amount: Number(p.amount), store: p.store }));
}
