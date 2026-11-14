import { describe, expect, it } from "vitest";
import { expiryOf, missingGrams, sortStock, stockByFood } from "./stock";
import { adherence } from "./supplements";

const today = "2026-11-14";

describe("expiryOf", () => {
  it.each([
    ["2026-11-13", "perime", -1],
    ["2026-11-14", "bientot", 0],
    ["2026-11-17", "bientot", 3],
    ["2026-11-18", "ok", 4],
  ])("%s → %s", (date, state, days) => {
    expect(expiryOf(date, today)).toEqual({ state, days });
  });

  it("sans date", () => {
    expect(expiryOf(null, today)).toEqual({ state: "sans-date", days: null });
  });
});

describe("sortStock", () => {
  it("par date, puis sans date par nom", () => {
    const items = [
      { name: "Riz", expiresOn: null },
      { name: "Skyr", expiresOn: "2026-11-16" },
      { name: "Avoine", expiresOn: null },
      { name: "Poulet", expiresOn: "2026-11-15" },
      { name: "Œufs", expiresOn: "2026-11-16" },
    ];
    expect(sortStock(items).map((i) => i.name)).toEqual(["Poulet", "Œufs", "Skyr", "Avoine", "Riz"]);
  });
});

describe("stockByFood", () => {
  it("additionne par aliment, sans les articles périmés, sans poids ou sans aliment", () => {
    const stock = stockByFood(
      [
        { foodId: "riz", grams: 500, expiresOn: null },
        { foodId: "riz", grams: 250, expiresOn: "2027-01-01" },
        { foodId: "skyr", grams: 450, expiresOn: "2026-11-10" },
        { foodId: "oeufs", grams: null, expiresOn: null },
        { foodId: null, grams: 300, expiresOn: null },
      ],
      today,
    );
    expect([...stock]).toEqual([["riz", 750]]);
  });
});

describe("missingGrams", () => {
  it("déduit le stock, jamais en dessous de zéro", () => {
    expect(missingGrams(900, 250)).toBe(650);
    expect(missingGrams(300, 750)).toBe(0);
    expect(missingGrams(300, 0)).toBe(300);
  });
});

describe("adherence", () => {
  it("compte les prises des 7 derniers jours", () => {
    const a = adherence(["2026-11-14", "2026-11-13", "2026-11-11", "2026-11-01"], "2026-10-01", today);
    expect(a.days).toHaveLength(7);
    expect(a.days[0].date).toBe("2026-11-08");
    expect(a.days[6]).toEqual({ date: today, taken: true, counted: true });
    expect([a.taken, a.counted]).toEqual([3, 7]);
  });

  it("ne compte pas les jours d'avant l'ajout", () => {
    const a = adherence(["2026-11-13"], "2026-11-13", today);
    expect([a.taken, a.counted]).toEqual([1, 2]);
    expect(a.days[0].counted).toBe(false);
  });
});
