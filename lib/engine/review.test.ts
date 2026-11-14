import { describe, expect, it } from "vitest";
import { reviewWeek, weekReview, type ReviewInput } from "./review";

const base: ReviewInput = {
  weekStart: "2026-11-02",
  sessionsPlanned: 4,
  workoutDates: ["2026-11-02", "2026-11-04", "2026-11-06", "2026-10-30", "2026-11-09"],
  activities: [{ date: "2026-11-07", minutes: 90 }, { date: "2026-10-31", minutes: 60 }],
  sets: 58,
  previousSets: 64,
  intake: [
    { date: "2026-11-02", kcal: 3500, proteinG: 185 },
    { date: "2026-11-03", kcal: 3300, proteinG: 170 },
    { date: "2026-11-04", kcal: 3700, proteinG: 195 },
    { date: "2026-11-05", kcal: 3200, proteinG: 160 },
    { date: "2026-11-06", kcal: 3600, proteinG: 190 },
    { date: "2026-10-30", kcal: 9000, proteinG: 10 },
  ],
  targets: { entrainement: { kcal: 3700, proteinG: 190 }, repos: { kcal: 3400, proteinG: 190 } },
  trainingDays: [1, 3, 5],
  weights: [
    { date: "2026-10-27", kg: 78.0 },
    { date: "2026-10-30", kg: 78.2 },
    { date: "2026-11-03", kg: 78.4 },
    { date: "2026-11-06", kg: 78.6 },
  ],
  rateTarget: { min: 0.25, max: 0.5 },
  checkins: [
    { date: "2026-11-02", sleep: 4, soreness: 2, energy: 4, stress: 2 },
    { date: "2026-11-05", sleep: 3, soreness: 3, energy: 3, stress: 3 },
    { date: "2026-10-28", sleep: 1, soreness: 5, energy: 1, stress: 5 },
  ],
  purchases: [{ on: "2026-11-02", amount: 16.25 }, { on: "2026-11-04", amount: 23.4 }, { on: "2026-10-31", amount: 41.8 }],
  budget: 50,
};

describe("weekReview", () => {
  const r = weekReview(base);

  it("ne compte que la semaine, du lundi au dimanche", () => {
    expect([r.weekStart, r.weekEnd]).toEqual(["2026-11-02", "2026-11-08"]);
    expect(r.training).toMatchObject({ sessions: 3, planned: 4, status: "partiel", sets: 58, previousSets: 64, sports: 1, sportsMinutes: 90 });
    expect(r.budget).toEqual({ spent: 39.65, budget: 50, remaining: 10.35 });
  });

  it("moyennes de nutrition face aux cibles des mêmes jours", () => {
    expect(r.nutrition.daysLogged).toBe(5);
    expect(r.nutrition.kcal).toBe(3460);
    expect(r.nutrition.proteinG).toBe(180);
    // Lundi, mercredi, vendredi : entraînement ; mardi, jeudi : repos.
    expect(r.nutrition.targetKcal).toBe(3580);
    expect(r.nutrition.kcalStatus).toBe("dans_la_cible");
    expect(r.nutrition.proteinReached).toBe(true);
  });

  it("poids : moyenne de la semaine et écart avec la précédente", () => {
    expect(r.weight.average).toBeCloseTo(78.5);
    expect(r.weight.change).toBeCloseTo(0.4);
    expect(r.weight.status).toBe("dans_la_cible");
  });

  it("forme : moyenne des check-ins de la semaine", () => {
    expect(r.readiness).toEqual({ days: 2, score: 3.5, level: "bonne" });
  });

  it("ne conclut rien sans données", () => {
    const empty = weekReview({ ...base, sessionsPlanned: null, workoutDates: [], activities: [], intake: base.intake.slice(0, 3), weights: [], checkins: [], purchases: [], budget: null });
    expect(empty.training.status).toBeNull();
    expect(empty.nutrition).toMatchObject({ daysLogged: 3, kcal: null, proteinG: null, kcalStatus: null, proteinReached: null });
    expect(empty.weight).toEqual({ average: null, change: null, status: null });
    expect(empty.readiness).toEqual({ days: 0, score: null, level: null });
    expect(empty.budget).toEqual({ spent: 0, budget: null, remaining: null });
  });

  it("statuts : objectif atteint, rien fait, calories hors cible, sans cibles", () => {
    expect(weekReview({ ...base, sessionsPlanned: 3 }).training.status).toBe("atteint");
    expect(weekReview({ ...base, workoutDates: [] }).training.status).toBe("rien");
    expect(weekReview({ ...base, targets: { entrainement: { kcal: 3000, proteinG: 220 }, repos: { kcal: 3000, proteinG: 220 } } }).nutrition).toMatchObject({
      kcalStatus: "au_dessus",
      proteinReached: false,
    });
    expect(weekReview({ ...base, targets: { entrainement: { kcal: 3700, proteinG: 190 } } }).nutrition).toMatchObject({ kcal: 3460, targetKcal: null, kcalStatus: null });
  });
});

describe("reviewWeek", () => {
  it.each([
    ["2026-11-08", "2026-11-02"], // dimanche : la semaine en cours
    ["2026-11-09", "2026-11-02"], // lundi : la semaine passée
    ["2026-11-14", "2026-11-02"], // samedi : toujours la semaine passée
    ["2026-11-15", "2026-11-09"],
  ])("%s → semaine du %s", (today, monday) => {
    expect(reviewWeek(today)).toBe(monday);
  });
});
