import { describe, expect, it } from "vitest";
import { adaptiveTdee, KCAL_PER_KG } from "./adaptive";
import { recipeNutrients, suggestTargets } from "./nutrition";

const day = (i: number) => new Date(Date.UTC(2026, 9, 10 + i)).toISOString().slice(0, 10);
const AS_OF = day(28); // 2026-11-07

describe("adaptiveTdee", () => {
  it("apports moyens moins la prise de poids convertie en énergie", () => {
    // 3 000 kcal par jour, +0,35 kg par semaine.
    const intake = Array.from({ length: 28 }, (_, i) => ({ date: day(i), kcal: 3000 }));
    const weights = Array.from({ length: 10 }, (_, k) => ({ date: day(k * 3), kg: 80 + (0.35 / 7) * k * 3 }));
    const r = adaptiveTdee({ intake, weights, asOf: AS_OF });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeklyChangeKg).toBeCloseTo(0.35, 2);
    expect(r.kcal).toBe(Math.round((3000 - (0.35 / 7) * KCAL_PER_KG) / 10) * 10); // 2 620
    expect(r.from).toBe(day(0));
    expect(r.to).toBe(day(27));
  });

  it("écarte les journées oubliées et compte une perte de poids", () => {
    const intake = Array.from({ length: 28 }, (_, i) => ({ date: day(i), kcal: i % 7 === 0 ? 600 : 2200 }));
    const weights = Array.from({ length: 8 }, (_, k) => ({ date: day(k * 4), kg: 75 - (0.5 / 7) * k * 4 }));
    const r = adaptiveTdee({ intake, weights, asOf: AS_OF });
    expect(r.ok && r.countedDays).toBe(24);
    expect(r.ok && r.loggedDays).toBe(28);
    expect(r.ok && r.intake).toBe(2200);
    expect(r.ok && r.kcal).toBe(Math.round((2200 + (0.5 / 7) * KCAL_PER_KG) / 10) * 10); // 2 750
  });

  it("ignore aujourd'hui, pas encore fini", () => {
    const intake = [...Array.from({ length: 28 }, (_, i) => ({ date: day(i), kcal: 2500 })), { date: AS_OF, kcal: 400 }];
    const weights = Array.from({ length: 5 }, (_, k) => ({ date: day(k * 7), kg: 70 }));
    const r = adaptiveTdee({ intake, weights, asOf: AS_OF });
    expect(r.ok && r.kcal).toBe(2500);
  });

  it("dit ce qui manque : des jours notés, puis des pesées étalées", () => {
    const few = Array.from({ length: 10 }, (_, i) => ({ date: day(i), kcal: 2500 }));
    const weights = Array.from({ length: 5 }, (_, k) => ({ date: day(k * 7), kg: 70 }));
    expect(adaptiveTdee({ intake: few, weights, asOf: AS_OF })).toMatchObject({ ok: false, reason: "jours", countedDays: 10, weighIns: 5, weightSpanDays: 28 });
    const intake = Array.from({ length: 28 }, (_, i) => ({ date: day(i), kcal: 2500 }));
    const close = Array.from({ length: 6 }, (_, k) => ({ date: day(20 + k), kg: 70 }));
    expect(adaptiveTdee({ intake, weights: close, asOf: AS_OF })).toMatchObject({ ok: false, reason: "pesees", weighIns: 6, weightSpanDays: 5 });
  });

  it("refuse un résultat hors des bornes plausibles", () => {
    const intake = Array.from({ length: 28 }, (_, i) => ({ date: day(i), kcal: 1500 }));
    const weights = Array.from({ length: 5 }, (_, k) => ({ date: day(k * 7), kg: 80 + k * 2 }));
    expect(adaptiveTdee({ intake, weights, asOf: AS_OF })).toMatchObject({ ok: false, reason: "incoherent" });
  });
});

describe("suggestTargets avec la dépense réelle", () => {
  it("part de la dépense mesurée au lieu de la formule", () => {
    const s = suggestTargets({ sex: "homme", weightKg: 85, heightCm: 195, age: 22, sessionsPerWeek: 4, goal: "prise_de_masse", maintenanceKcal: 3200 });
    expect(s.maintenance).toBe(3200);
    expect(s.entrainement.kcal).toBe(Math.round((3200 * 1.1 * 1.05) / 50) * 50);
  });
});

describe("recipeNutrients", () => {
  const rice = { kcal: 350, proteinG: 7, carbsG: 77, fatG: 1 };
  const chicken = { kcal: 120, proteinG: 23, carbsG: 0, fatG: 2.5 };

  it("somme les ingrédients et ramène au plat cuit", () => {
    const r = recipeNutrients(
      [
        { grams: 400, per100: rice },
        { grams: 600, per100: chicken },
      ],
      2000,
      4,
    );
    expect(r.total.kcal).toBe(1400 + 720);
    expect(r.rawG).toBe(1000);
    expect(r.totalG).toBe(2000);
    expect(r.per100.kcal).toBeCloseTo(106);
    expect(r.per100.proteinG).toBeCloseTo((28 + 138) / 20);
    expect(r.portionG).toBe(500);
    expect(r.perPortion.kcal).toBeCloseTo(530);
  });

  it("sans pesée du plat cuit, le poids total est la somme crue", () => {
    const r = recipeNutrients([{ grams: 200, per100: rice }], null, 2);
    expect(r.totalG).toBe(200);
    expect(r.per100.kcal).toBe(350);
    expect(r.portionG).toBe(100);
  });

  it("recette vide : rien", () => {
    expect(recipeNutrients([]).per100.kcal).toBe(0);
  });
});
