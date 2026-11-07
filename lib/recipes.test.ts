import { describe, expect, it } from "vitest";
import { recipeRow } from "./recipes";

const per100 = (kcal: number, proteinG: number, carbsG: number, fatG: number) => ({ kcal, proteinG, carbsG, fatG });

describe("recipeRow", () => {
  it("garde les valeurs pour 100 g du plat cuit et la part comme portion", () => {
    const r = recipeRow(
      [
        { grams: 400, per100: per100(350, 7.5, 78, 0.9) }, // riz cru
        { grams: 600, per100: per100(110, 23, 0, 1.5) }, // poulet cru
      ],
      1500,
      4,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1 400 + 660 kcal pour 1 500 g cuits.
    expect(r.row.kcal).toBe(137.3);
    expect(r.row.portion_g).toBe(375);
    expect(r.row.portion_label).toBe("1 part");
    expect(r.row.recipe_total_g).toBe(1500);
    expect(r.row.recipe_portions).toBe(4);
  });

  it("sans pesée, prend la somme crue et ne garde pas de poids cuit", () => {
    const r = recipeRow([{ grams: 300, per100: per100(100, 10, 10, 1) }], null, 3);
    expect(r.ok && r.row.portion_g).toBe(100);
    expect(r.ok && r.row.recipe_total_g).toBeNull();
  });

  it("l'arrondi ne fait jamais dépasser 100 g de macros pour 100 g", () => {
    // Trois ingrédients purs : 33,36 + 33,36 + 33,28 = 100 g, mais 33,4 + 33,4 + 33,3 une fois arrondis.
    const r = recipeRow(
      [
        { grams: 33.36, per100: per100(900, 0, 0, 100) },
        { grams: 33.36, per100: per100(400, 0, 100, 0) },
        { grams: 33.28, per100: per100(400, 100, 0, 0) },
      ],
      null,
      1,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.round((r.row.protein_g + r.row.carbs_g + r.row.fat_g) * 10) / 10).toBe(100);
    expect(r.row.fat_g + r.row.carbs_g).toBeCloseTo(66.7, 5);
  });

  it("refuse un poids cuit impossible, une part trop lourde ou une recette vide", () => {
    const items = [{ grams: 500, per100: per100(350, 10, 70, 2) }];
    expect(recipeRow(items, 100, 1)).toMatchObject({ ok: false });
    expect(recipeRow([{ grams: 3000, per100: per100(100, 5, 10, 2) }], null, 1)).toMatchObject({ ok: false, error: expect.stringContaining("2 kg") });
    expect(recipeRow([], null, 1)).toMatchObject({ ok: false, error: "Ajoute au moins un ingrédient." });
  });
});
