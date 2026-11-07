import { describe, expect, it } from "vitest";
import { dayTypeFor, frequentFoods, isoWeekday, mealForTime, nutrientsFor, suggestTargets, sumNutrients } from ".";

describe("apports", () => {
  it("calcule une quantité à partir des valeurs pour 100 g", () => {
    const oats = { kcal: 370, proteinG: 13.5, carbsG: 58.7, fatG: 7 };
    const n = nutrientsFor(oats, 80);
    expect(n.kcal).toBeCloseTo(296, 6);
    expect(n.proteinG).toBeCloseTo(10.8, 6);
    expect(n.carbsG).toBeCloseTo(46.96, 6);
    expect(n.fatG).toBeCloseTo(5.6, 6);
    expect(nutrientsFor(oats, 0).kcal).toBe(0);
    expect(nutrientsFor(oats, -10).kcal).toBe(0);
  });

  it("additionne les apports", () => {
    expect(
      sumNutrients([
        { kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 },
        { kcal: 50, proteinG: 1, carbsG: 10, fatG: 0 },
      ]),
    ).toEqual({ kcal: 150, proteinG: 11, carbsG: 15, fatG: 2 });
    expect(sumNutrients([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("repas et type de jour", () => {
  it("propose le repas selon l'heure", () => {
    expect(mealForTime(7)).toBe("petit_dejeuner");
    expect(mealForTime(10, 29)).toBe("petit_dejeuner");
    expect(mealForTime(10, 30)).toBe("dejeuner");
    expect(mealForTime(16)).toBe("collation");
    expect(mealForTime(18, 30)).toBe("diner");
    expect(mealForTime(1)).toBe("petit_dejeuner");
  });

  it("numérote les jours du lundi (1) au dimanche (7)", () => {
    expect(isoWeekday("2026-11-09")).toBe(1);
    expect(isoWeekday("2026-11-15")).toBe(7);
  });

  it("reconnaît un jour d'entraînement habituel ou une séance faite", () => {
    expect(dayTypeFor("2026-11-09", [1, 3, 5], false)).toBe("entrainement");
    expect(dayTypeFor("2026-11-10", [1, 3, 5], false)).toBe("repos");
    expect(dayTypeFor("2026-11-10", [1, 3, 5], true)).toBe("entrainement");
    expect(dayTypeFor("2026-11-10", [], false)).toBe("repos");
  });
});

describe("aliments fréquents", () => {
  it("classe par fréquence puis récence, avec la dernière quantité", () => {
    const uses = [
      { foodId: "avoine", grams: 60, at: "2026-11-01T07:00:00Z" },
      { foodId: "avoine", grams: 80, at: "2026-11-05T07:00:00Z" },
      { foodId: "avoine", grams: 70, at: "2026-11-03T07:00:00Z" },
      { foodId: "banane", grams: 120, at: "2026-11-06T07:00:00Z" },
      { foodId: "poulet", grams: 150, at: "2026-11-04T12:00:00Z" },
    ];
    const top = frequentFoods(uses, 2);
    expect(top.map((f) => f.foodId)).toEqual(["avoine", "banane"]);
    expect(top[0]).toMatchObject({ count: 3, lastGrams: 80 });
  });
});

describe("cible suggérée", () => {
  const person = { sex: "homme" as const, weightKg: 75, heightCm: 180, age: 22, sessionsPerWeek: 4, goal: "prise_de_masse" };

  it("ajoute 10 % en prise de masse, avec 2 g de protéines par kg", () => {
    // Métabolisme de base 1 770 kcal × 1,55 = 2 743,5 ; × 1,1 = 3 017,85.
    const s = suggestTargets(person);
    expect(s.maintenance).toBe(2750);
    expect(s.entrainement).toEqual({ kcal: 3150, proteinG: 150 });
    expect(s.repos).toEqual({ kcal: 2850, proteinG: 150 });
  });

  it("retire 20 % en sèche et garde le maintien sinon, à 1,6 g/kg hors musculation", () => {
    expect(suggestTargets({ ...person, goal: "seche" }).entrainement.kcal).toBe(2300);
    const runner = suggestTargets({ ...person, goal: "marathon" });
    expect(runner.entrainement.kcal).toBe(2900);
    expect(runner.repos.proteinG).toBe(120);
  });
});
