import { describe, expect, it } from "vitest";
import { budgetStatus, costOf, dayCost, guessAisle, ingredientsEaten, listCost, purchaseGrams } from "./groceries";

describe("guessAisle", () => {
  it.each([
    ["Blanc de poulet", "viandes_poissons"],
    ["Riz basmati", "feculents"],
    ["Flocons d'avoine", "feculents"],
    ["Skyr nature", "frais"],
    ["Œufs", "frais"],
    ["Bananes", "fruits_legumes"],
    ["Pommes de terre", "fruits_legumes"],
    ["Lait de coco", "epicerie"],
    ["Beurre de cacahuète", "epicerie"],
    ["Huile d'olive", "epicerie"],
    ["Épinards surgelés", "surgeles"],
    ["Eau pétillante", "boissons"],
    ["Liquide vaisselle", "hygiene"],
    ["Piles AAA", "autre"],
  ])("%s → %s", (name, aisle) => {
    expect(guessAisle(name)).toBe(aisle);
  });

  it("ne reconnaît un mot qu'en début de mot", () => {
    expect(guessAisle("Vaisselle jetable")).toBe("autre");
    expect(guessAisle("Bail")).toBe("autre");
  });
});

describe("ingredientsEaten", () => {
  const recipes = new Map([["curry", { totalG: 1600, items: [{ foodId: "poulet", grams: 800 }, { foodId: "riz", grams: 400 }] }]]);

  it("additionne par aliment, du plus lourd au plus léger", () => {
    expect(ingredientsEaten([{ foodId: "riz", grams: 100 }, { foodId: "skyr", grams: 300 }, { foodId: "riz", grams: 80 }], new Map())).toEqual([
      { foodId: "skyr", grams: 300 },
      { foodId: "riz", grams: 180 },
    ]);
  });

  it("déplie une recette au prorata de la part mangée", () => {
    expect(ingredientsEaten([{ foodId: "curry", grams: 400 }, { foodId: "riz", grams: 50 }], recipes)).toEqual([
      { foodId: "poulet", grams: 200 },
      { foodId: "riz", grams: 150 },
    ]);
  });

  it("garde telle quelle une recette sans ingrédients et ne boucle pas", () => {
    const loop = new Map([
      ["a", { totalG: 100, items: [{ foodId: "b", grams: 100 }] }],
      ["b", { totalG: 100, items: [{ foodId: "a", grams: 100 }] }],
      ["vide", { totalG: 500, items: [] }],
    ]);
    expect(ingredientsEaten([{ foodId: "vide", grams: 200 }], loop)).toEqual([{ foodId: "vide", grams: 200 }]);
    expect(ingredientsEaten([{ foodId: "a", grams: 100 }], loop)).toHaveLength(1);
  });
});

describe("purchaseGrams", () => {
  it.each([
    [0, 0],
    [30, 50],
    [100, 100],
    [120, 200],
    [900, 900],
    [1000, 1000],
    [1010, 1250],
    [2400, 2500],
  ])("%d g → %d g", (grams, expected) => {
    expect(purchaseGrams(grams)).toBe(expected);
  });
});

describe("coûts", () => {
  it("coût d'une quantité au centime", () => {
    expect(costOf(900, 11.9)).toBe(10.71);
    expect(costOf(250, 2.4)).toBe(0.6);
    expect(costOf(333, 2.5)).toBe(0.83);
  });

  it("total de la liste et articles sans prix", () => {
    expect(
      listCost([
        { grams: 900, pricePerKg: 11.9 },
        { grams: 1000, pricePerKg: 2.4 },
        { grams: 500, pricePerKg: null },
        { grams: null, pricePerKg: null },
      ]),
    ).toEqual({ total: 13.11, priced: 2, unpriced: 2 });
    expect(listCost([])).toEqual({ total: 0, priced: 0, unpriced: 0 });
  });
});

describe("budgetStatus", () => {
  const week = "2026-11-09";

  it("dépensé, reste et part du budget sur la semaine", () => {
    const s = budgetStatus(50, [{ on: "2026-11-09", amount: 31.4 }, { on: "2026-11-12", amount: 8.25 }, { on: "2026-11-16", amount: 99 }], week);
    expect(s.spent).toBe(39.65);
    expect(s.remaining).toBe(10.35);
    expect(s.ratio).toBeCloseTo(0.793);
    expect(s.average).toBeNull();
  });

  it("reste négatif quand le budget est dépassé, rien sans budget", () => {
    expect(budgetStatus(30, [{ on: "2026-11-10", amount: 42 }], week).remaining).toBe(-12);
    expect(budgetStatus(null, [{ on: "2026-11-10", amount: 42 }], week)).toMatchObject({ spent: 42, remaining: null, ratio: null });
  });

  it("moyenne sur les semaines notées, quatre au plus", () => {
    const purchases = [
      { on: "2026-11-03", amount: 40 },
      { on: "2026-10-28", amount: 60 },
      { on: "2026-09-01", amount: 500 },
    ];
    // Premier achat compté le 28 octobre : deux semaines écoulées.
    expect(budgetStatus(50, purchases, week).average).toBe(50);
    expect(budgetStatus(50, [...purchases, { on: "2026-10-12", amount: 100 }], week).average).toBe(50);
  });
});

describe("dayCost", () => {
  const prices = new Map([["poulet", 12], ["riz", 2]]);

  it("coût moyen par jour de ce qui a un prix, avec la couverture", () => {
    const eaten = [
      { foodId: "poulet", grams: 1400, kcal: 1700 },
      { foodId: "riz", grams: 700, kcal: 2450 },
      { foodId: "huile", grams: 70, kcal: 630 },
    ];
    const c = dayCost(eaten, prices, 7);
    expect(c.perDay).toBe(2.6);
    expect(c.coverage).toBeCloseTo(4150 / 4780);
  });

  it("pas de chiffre sous 50 % de calories couvertes, ni sans rien de noté", () => {
    expect(dayCost([{ foodId: "riz", grams: 100, kcal: 350 }, { foodId: "huile", grams: 100, kcal: 900 }], prices, 7).perDay).toBeNull();
    expect(dayCost([], prices, 7)).toEqual({ perDay: null, coverage: 0 });
  });
});
