import { describe, expect, it } from "vitest";
import { activitiesKcal, activityKcal, INTENSITIES, sportMet, SPORT_METS, weightOn } from ".";

describe("MET des sports", () => {
  it("monte avec l'intensité pour chaque sport", () => {
    for (const [sport, mets] of Object.entries(SPORT_METS)) {
      expect(mets[0], sport).toBeLessThan(mets[1]);
      expect(mets[1], sport).toBeLessThan(mets[2]);
    }
  });

  it("reprend les valeurs du Compendium 2024", () => {
    expect(sportMet("tennis", "moderee")).toBe(6.8);
    expect(sportMet("foot", "intense")).toBe(9.5);
    expect(sportMet("padel", "legere")).toBe(4.5);
  });

  it("un sport inconnu prend les repères de « autre »", () => {
    expect(INTENSITIES.map((i) => sportMet("curling", i))).toEqual([4, 6, 8]);
  });
});

describe("dépense estimée", () => {
  it("MET × kg × heures, arrondi à 5 kcal", () => {
    // 90 min de padel intense à 75 kg : 8 × 75 × 1,5 = 900 kcal.
    expect(activityKcal(8, 75, 90)).toBe(900);
    // 6,8 × 72,4 × 1 = 492,3 → 490.
    expect(activityKcal(6.8, 72.4, 60)).toBe(490);
  });

  it("prend la dernière pesée du jour ou d'avant, sinon la première d'après", () => {
    const weights = [
      { date: "2026-11-01", kg: 74 },
      { date: "2026-11-04", kg: 75 },
      { date: "2026-11-08", kg: 76 },
    ];
    expect(weightOn(weights, "2026-11-04")).toBe(75);
    expect(weightOn(weights, "2026-11-06")).toBe(75);
    expect(weightOn(weights, "2026-10-20")).toBe(74);
    expect(weightOn([], "2026-11-06")).toBeNull();
  });

  it("ne devine rien sans pesée", () => {
    const activity = { date: "2026-11-05", sport: "padel", minutes: 90, intensity: "intense" as const };
    expect(activitiesKcal([activity], [])).toEqual([null]);
    expect(activitiesKcal([activity], [{ date: "2026-11-01", kg: 75 }])).toEqual([900]);
  });
});
