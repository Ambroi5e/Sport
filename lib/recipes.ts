/** Recettes : ce que l'on enregistre pour qu'une recette se note comme un aliment. */
import { recipeNutrients, type Nutrients, type RecipeNutrients } from "@/lib/engine";

export const MAX_RECIPE_ITEMS = 40;
export const MAX_PORTIONS = 50;
/** Une portion d'aliment pèse 2 kg au plus (contrainte de `foods`). */
const MAX_PORTION_G = 2000;
export const PORTION_LABEL = "1 part";

const round1 = (n: number) => Math.round(n * 10) / 10;

export type RecipeRow = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion_g: number;
  portion_label: string;
  recipe_total_g: number | null;
  recipe_portions: number;
};

/**
 * Valeurs d'une recette telles que `foods` les garde : pour 100 g du plat cuit,
 * une décimale, la part comme portion. Refuse ce qu'aucun aliment ne peut contenir
 * (plus de 900 kcal ou de 100 g de macros pour 100 g : souvent une pesée erronée).
 */
export function recipeRow(
  items: readonly { grams: number; per100: Nutrients }[],
  cookedG: number | null,
  portions: number,
): { ok: true; row: RecipeRow; values: RecipeNutrients } | { ok: false; error: string; values: RecipeNutrients } {
  const values = recipeNutrients(items, cookedG, portions);
  if (!items.length) return { ok: false, error: "Ajoute au moins un ingrédient.", values };
  const p = values.per100;
  // Petite marge : une somme en virgule flottante dépasse parfois 100 d'un cheveu.
  if (p.kcal > 900.05 || p.proteinG + p.carbsG + p.fatG > 100.05) {
    return {
      ok: false,
      error: "Avec ce poids cuit, 100 g du plat contiendraient plus qu'un aliment ne peut en contenir. Vérifie la pesée : marmite pleine moins marmite vide.",
      values,
    };
  }
  if (values.portionG > MAX_PORTION_G) return { ok: false, error: "Une part pèse 2 kg au plus : augmente le nombre de parts.", values };
  if (values.portionG < 1) return { ok: false, error: "Une part pèse au moins 1 g : réduis le nombre de parts.", values };

  const macros = { protein_g: round1(p.proteinG), carbs_g: round1(p.carbsG), fat_g: round1(p.fatG) };
  // L'arrondi peut faire passer la somme à 100,1 g : on retire l'excès à la plus grosse.
  const excess = round1(macros.protein_g + macros.carbs_g + macros.fat_g - 100);
  if (excess > 0) {
    const key = (Object.keys(macros) as (keyof typeof macros)[]).reduce((a, b) => (macros[a] >= macros[b] ? a : b));
    macros[key] = round1(macros[key] - excess);
  }
  return {
    ok: true,
    values,
    row: {
      kcal: round1(p.kcal),
      ...macros,
      portion_g: round1(values.portionG),
      portion_label: PORTION_LABEL,
      recipe_total_g: cookedG,
      recipe_portions: Math.max(1, Math.round(portions)),
    },
  };
}
