import "server-only";
import { requireUserId } from "@/lib/auth";
import { FOOD_COLUMNS, toFood, type Food } from "@/lib/nutrition";
import { fromOpenFoodFacts, OFF_FIELDS, type OffFood, type OffProduct } from "@/lib/openfoodfacts";
import { createClient } from "@/lib/supabase/server";

/** Un aliment déjà connu sous ce code-barres : le sien d'abord, sinon le catalogue. */
export async function findFoodByBarcode(code: string): Promise<Food | null> {
  await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("foods").select(FOOD_COLUMNS).eq("barcode", code).is("archived_at", null).limit(5);
  const rows = (data ?? []).map(toFood);
  return rows.find((f) => f.personal) ?? rows[0] ?? null;
}

export type OffLookup = { status: "found"; food: OffFood } | { status: "unknown" } | { status: "error" };

/**
 * Fiche Open Food Facts, demandée par le serveur : seul le code-barres part,
 * jamais qui scanne. Réponse gardée un jour en cache, 5 secondes au plus.
 */
export async function lookupOpenFoodFacts(code: string): Promise<OffLookup> {
  await requireUserId();
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=${OFF_FIELDS}`, {
      headers: { "User-Agent": "Fonte/0.6.2 (https://github.com/Ambroi5e/Sport)", Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86_400 },
    });
    if (res.status === 404) return { status: "unknown" };
    if (!res.ok) return { status: "error" };
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    const food = body.status === 1 && body.product ? fromOpenFoodFacts(body.product) : null;
    return food ? { status: "found", food } : { status: "unknown" };
  } catch {
    return { status: "error" };
  }
}

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, useGrouping: false });

/** Valeurs d'une fiche telles que le formulaire d'aliment les attend. */
export function offPrefill(food: OffFood) {
  const n = (v: number | undefined) => (v === undefined ? undefined : decimal.format(v));
  return {
    name: food.name,
    brand: food.brand ?? undefined,
    kcal: n(food.per100.kcal),
    proteinG: n(food.per100.proteinG),
    carbsG: n(food.per100.carbsG),
    fatG: n(food.per100.fatG),
    portionLabel: food.portion?.label,
    portionG: n(food.portion?.g),
  };
}
