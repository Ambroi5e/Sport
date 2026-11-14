import { describe, expect, it } from "vitest";
import { activitiesKcal, activityMet, speedMet } from "./activity";
import { enduranceRecords, isEndurance, isFaster, paceOf, weeklyDistance, type Outing } from "./endurance";

describe("allure", () => {
  it("min/km pour la course, km/h pour le vélo, min/100 m en natation, min/500 m au rameur", () => {
    expect(paceOf("course", 10_000, 47 * 60 + 30)).toEqual({ unit: "min_km", value: 285 });
    expect(paceOf("velo", 45_000, 90 * 60)).toEqual({ unit: "kmh", value: 30 });
    expect(paceOf("natation", 1500, 30 * 60)).toEqual({ unit: "min_100m", value: 120 });
    expect(paceOf("rameur", 2000, 7 * 60 + 40)).toEqual({ unit: "min_500m", value: 115 });
  });

  it("rien sans distance ou sans durée", () => {
    expect(paceOf("course", null, 1800)).toBeNull();
    expect(paceOf("course", 0, 1800)).toBeNull();
    expect(paceOf("course", 5000, 0)).toBeNull();
  });

  it("plus rapide : moins de secondes au kilomètre, plus de km/h", () => {
    expect(isFaster({ unit: "min_km", value: 280 }, { unit: "min_km", value: 285 })).toBe(true);
    expect(isFaster({ unit: "kmh", value: 31 }, { unit: "kmh", value: 30 })).toBe(true);
    expect(isFaster({ unit: "kmh", value: 29 }, { unit: "kmh", value: 30 })).toBe(false);
  });

  it("reconnaît les sports d'endurance", () => {
    expect(isEndurance("course")).toBe(true);
    expect(isEndurance("padel")).toBe(false);
  });
});

describe("dépense selon la vitesse", () => {
  it("prend la tranche de vitesse la plus proche du Compendium", () => {
    expect(speedMet("course", 10)).toBe(9.3);
    expect(speedMet("course", 12.2)).toBe(11.8);
    expect(speedMet("course", 25)).toBe(18.5);
    expect(speedMet("marche", 5.2)).toBe(3.8);
    expect(speedMet("velo", 30)).toBeNull();
    expect(speedMet("course", 0)).toBeNull();
  });

  it("la vitesse l'emporte sur l'intensité quand la distance est connue", () => {
    expect(activityMet("course", "legere", 12_000, 3600)).toBe(11.8);
    expect(activityMet("course", "legere")).toBe(7.5);
    expect(activityMet("course", "legere", null, 3600)).toBe(7.5);
    expect(activityMet("velo", "intense", 30_000, 3600)).toBe(9);
  });

  it("compte la durée exacte d'une sortie mesurée", () => {
    const weights = [{ date: "2026-11-01", kg: 80 }];
    // 10 km en 50 min : 12 km/h, MET 11,8 × 80 kg × 50/60 h = 787 → 785.
    expect(activitiesKcal([{ date: "2026-11-10", sport: "course", minutes: 50, intensity: "moderee", distanceM: 10_000, seconds: 3000 }], weights)).toEqual([785]);
    expect(activitiesKcal([{ date: "2026-11-10", sport: "padel", minutes: 90, intensity: "moderee" }], weights)).toEqual([720]);
  });
});

const run = (id: string, date: string, km: number, minutes: number, elevationM: number | null = null): Outing => ({
  id,
  date,
  sport: "course",
  distanceM: km * 1000,
  seconds: minutes * 60,
  elevationM,
});

describe("kilomètres par semaine", () => {
  // Samedi 14 novembre 2026 : la semaine en cours commence le lundi 9.
  const today = "2026-11-14";
  const outings: Outing[] = [
    run("a", "2026-11-09", 8, 44),
    run("b", "2026-11-12", 12, 66),
    run("c", "2026-11-08", 10, 55),
    run("d", "2026-10-20", 5, 30),
    run("vieux", "2026-08-01", 30, 200),
    run("futur", "2026-11-15", 30, 200),
    { id: "velo", date: "2026-11-10", sport: "velo", distanceM: 40_000, seconds: 5400 },
    { id: "sans", date: "2026-11-11", sport: "course", distanceM: null, seconds: 1800 },
  ];

  it("additionne par semaine du lundi au dimanche, la semaine en cours en dernier", () => {
    const weeks = weeklyDistance(outings, "course", today, 4);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(weeks.map((w) => w.meters)).toEqual([5000, 0, 10_000, 20_000]);
    expect(weeks[3]).toMatchObject({ outings: 3, seconds: (44 + 66 + 30) * 60 });
  });

  it("huit semaines par défaut, sans les autres sports", () => {
    const weeks = weeklyDistance(outings, "velo", today);
    expect(weeks).toHaveLength(8);
    expect(weeks.reduce((sum, w) => sum + w.meters, 0)).toBe(40_000);
  });
});

describe("records", () => {
  const outings: Outing[] = [
    run("a", "2026-09-01", 5, 26),
    run("b", "2026-09-20", 10.2, 51, 120),
    run("c", "2026-10-05", 12, 66, 80),
    run("d", "2026-10-20", 6, 28.5),
    run("e", "2026-11-02", 21.3, 118, 60),
    { id: "sans", date: "2026-11-03", sport: "course", distanceM: null, seconds: 600 },
  ];

  it("plus longue sortie, plus gros dénivelé et meilleure allure par seuil atteint", () => {
    const r = enduranceRecords(outings, "course");
    expect(r.longest?.id).toBe("e");
    expect(r.climb?.id).toBe("b");
    expect(r.paces.map((p) => [p.meters, p.outing.id, p.pace.value])).toEqual([
      [5000, "d", 285],
      [10_000, "b", 300],
      [21_097, "e", 332],
    ]);
  });

  it("à allure égale, la sortie la plus ancienne garde le record", () => {
    const r = enduranceRecords([run("tard", "2026-11-10", 5, 25), run("tot", "2026-10-10", 5, 25)], "course");
    expect(r.paces[0].outing.id).toBe("tot");
  });

  it("rien sans sortie mesurée", () => {
    expect(enduranceRecords(outings, "natation")).toEqual({ longest: null, climb: null, paces: [] });
  });
});
