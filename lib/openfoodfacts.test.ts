import { describe, expect, it } from "vitest";
import { fromOpenFoodFacts } from "./openfoodfacts";

describe("fromOpenFoodFacts", () => {
  it("reprend nom, marque, valeurs pour 100 g et portion", () => {
    const food = fromOpenFoodFacts({
      product_name: "Flocons d'avoine complets",
      brands: "Quaker, PepsiCo",
      nutriments: { "energy-kcal_100g": 372, proteins_100g: 13.5, carbohydrates_100g: 58.7, fat_100g: "7,04" },
      serving_quantity: 40,
      serving_size: "40 g",
    });
    expect(food).toEqual({
      name: "Flocons d'avoine complets",
      brand: "Quaker",
      per100: { kcal: 372, proteinG: 13.5, carbsG: 58.7, fatG: 7 },
      portion: { g: 40, label: "1 portion (40 g)" },
      complete: true,
    });
  });

  it("préfère le nom français et convertit les kJ", () => {
    const food = fromOpenFoodFacts({ product_name: "Oat flakes", product_name_fr: "Flocons", nutriments: { energy_100g: 1569 } });
    expect(food?.name).toBe("Flocons");
    expect(food?.per100.kcal).toBe(375);
    expect(food?.complete).toBe(false);
  });

  it("écarte les valeurs impossibles et marque la fiche incomplète", () => {
    const food = fromOpenFoodFacts({ product_name: "Erreur", nutriments: { "energy-kcal_100g": 3720, proteins_100g: 135, carbohydrates_100g: 10, fat_100g: 2 } });
    expect(food?.per100).toEqual({ carbsG: 10, fatG: 2 });
    expect(food?.complete).toBe(false);
  });

  it("garde une portion nommée et ignore une fiche sans nom", () => {
    expect(fromOpenFoodFacts({ product_name: "Biscuits", serving_size: "1 biscuit (12,5 g)", serving_quantity: "12.5" })?.portion).toEqual({ g: 12.5, label: "1 biscuit (12,5 g)" });
    expect(fromOpenFoodFacts({ product_name: " " })).toBeNull();
  });
});
