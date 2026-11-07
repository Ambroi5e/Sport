import { describe, expect, it } from "vitest";
import {
  currentWeek,
  e1rmHistory,
  measurementChanges,
  mostTrackedExercises,
  paceAlert,
  rollingWeekAverages,
  weeklyVolume,
  weightSeries,
  type SetEntry,
  type WeighIn,
} from ".";

/** Pesées quotidiennes de `from` pendant `days` jours, en partant de `start` kg et en prenant `perWeek` kg par semaine. */
function daily(from: string, days: number, start: number, perWeek: number): WeighIn[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), kg: start + (perWeek / 7) * i };
  });
}

function set(partial: Partial<SetEntry>): SetEntry {
  return { exerciseId: "bench", workoutId: "w1", date: "2026-11-02", weightKg: 80, reps: 8, ...partial };
}

describe("courbe du poids", () => {
  const entries: WeighIn[] = [
    { date: "2026-11-01", kg: 80 },
    { date: "2026-11-03", kg: 81 },
    { date: "2026-11-04", kg: 82 },
    { date: "2026-10-20", kg: 79 },
  ];

  it("garde les pesées de la période, dans l'ordre", () => {
    expect(weightSeries(entries, "2026-11-01", "2026-11-07").weighIns.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-03", "2026-11-04"]);
  });

  it("trace la moyenne chaque jour de la première à la dernière pesée", () => {
    const { average } = weightSeries(entries, "2026-11-01", "2026-11-07");
    expect(average.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(average[0].value).toBe(80);
    expect(average[2].value).toBeCloseTo(80.5, 10);
    expect(average[3].value).toBeCloseTo(81, 10);
  });

  it("la moyenne tient compte des pesées d'avant la période", () => {
    const { average } = weightSeries([{ date: "2026-10-30", kg: 78 }, ...entries], "2026-11-01", "2026-11-07");
    expect(average[0].value).toBe(79);
  });

  it("rien à tracer sans pesée", () => {
    expect(weightSeries(entries, "2026-12-01", "2026-12-07")).toEqual({ weighIns: [], average: [] });
  });
});

describe("alerte de rythme", () => {
  const bulk = { min: 0.25, max: 0.5 };

  it("calcule trois moyennes hebdomadaires glissantes", () => {
    const avgs = rollingWeekAverages(daily("2026-10-18", 21, 80, 0.7), "2026-11-07");
    expect(avgs).toHaveLength(3);
    expect(avgs[1]! - avgs[0]!).toBeCloseTo(0.7, 10);
    expect(avgs[2]! - avgs[1]!).toBeCloseTo(0.7, 10);
  });

  it("une semaine avec une seule pesée ne compte pas", () => {
    const sparse = [...daily("2026-10-25", 14, 80, 0.3), { date: "2026-10-20", kg: 79.5 }];
    expect(rollingWeekAverages(sparse, "2026-11-07")[0]).toBeNull();
    expect(paceAlert(sparse, "2026-11-07", bulk)).toBeNull();
  });

  it("prise trop rapide deux semaines de suite : retirer 200 kcal", () => {
    const alert = paceAlert(daily("2026-10-18", 21, 80, 0.8), "2026-11-07", bulk);
    expect(alert?.direction).toBe("au_dessus");
    expect(alert?.kcal).toBe(-200);
    expect(alert?.changes[0]).toBeCloseTo(0.8, 10);
  });

  it("prise trop lente deux semaines de suite : ajouter 200 kcal", () => {
    const alert = paceAlert(daily("2026-10-18", 21, 80, 0.1), "2026-11-07", bulk);
    expect(alert).toMatchObject({ direction: "en_dessous", kcal: 200 });
  });

  it("pas d'alerte si une seule semaine sort de la cible", () => {
    const entries = [...daily("2026-10-18", 14, 80, 0.3), ...daily("2026-11-01", 7, 81, 0.1)];
    const avgs = rollingWeekAverages(entries, "2026-11-07");
    expect(avgs[2]! - avgs[1]!).toBeGreaterThan(0.5);
    expect(paceAlert(entries, "2026-11-07", bulk)).toBeNull();
  });

  it("pas d'alerte dans la cible, ni pour des écarts de sens opposés", () => {
    expect(paceAlert(daily("2026-10-18", 21, 80, 0.4), "2026-11-07", bulk)).toBeNull();
    const zigzag = [...daily("2026-10-18", 7, 80, 0), ...daily("2026-10-25", 7, 81, 0), ...daily("2026-11-01", 7, 80.9, 0)];
    expect(paceAlert(zigzag, "2026-11-07", bulk)).toBeNull();
  });

  it("en sèche, une perte trop lente propose aussi de retirer 200 kcal", () => {
    const alert = paceAlert(daily("2026-10-18", 21, 90, -0.1), "2026-11-07", { min: -1, max: -0.25 });
    expect(alert).toMatchObject({ direction: "au_dessus", kcal: -200 });
  });
});

describe("mensurations", () => {
  it("donne l'écart depuis la première mesure et depuis la précédente", () => {
    const changes = measurementChanges([
      { date: "2026-10-15", site: "bras", cm: 38.5 },
      { date: "2026-09-01", site: "bras", cm: 37 },
      { date: "2026-11-01", site: "bras", cm: 39 },
      { date: "2026-11-01", site: "taille", cm: 82 },
    ]);
    expect(changes.bras).toMatchObject({ first: { date: "2026-09-01", cm: 37 }, latest: { date: "2026-11-01", cm: 39 }, count: 3 });
    expect(changes.bras.sinceFirst).toBeCloseTo(2, 10);
    expect(changes.bras.sincePrevious).toBeCloseTo(0.5, 10);
    expect(changes.taille).toMatchObject({ sinceFirst: 0, sincePrevious: null, previous: null, count: 1 });
  });
});

describe("volume par semaine", () => {
  it("additionne par semaine du lundi au dimanche, semaines vides comprises", () => {
    const weeks = weeklyVolume(
      [
        set({ date: "2026-11-02", reps: 10 }), // lundi
        set({ date: "2026-11-08", reps: 10, workoutId: "w2" }), // dimanche, même semaine
        set({ date: "2026-11-08", reps: 10, workoutId: "w2", isWarmup: true }),
        set({ date: "2026-10-26", weightKg: 50, reps: 10, workoutId: "w0" }),
        set({ date: "2026-08-01", workoutId: "trop-vieux" }),
      ],
      "2026-11-07",
      3,
    );
    expect(weeks).toEqual([
      { weekStart: "2026-10-19", volume: 0, sets: 0, sessions: 0 },
      { weekStart: "2026-10-26", volume: 500, sets: 1, sessions: 1 },
      { weekStart: "2026-11-02", volume: 1600, sets: 2, sessions: 2 },
    ]);
  });
});

describe("1RM estimé par séance", () => {
  const sets = [
    set({ workoutId: "w1", date: "2026-10-26", weightKg: 80, reps: 8 }),
    set({ workoutId: "w1", date: "2026-10-26", weightKg: 85, reps: 5 }),
    set({ workoutId: "w1", date: "2026-10-26", weightKg: 120, reps: 1, isWarmup: true }),
    set({ workoutId: "w2", date: "2026-11-02", weightKg: 82.5, reps: 8 }),
    set({ workoutId: "w3", date: "2026-11-04", weightKg: 40, reps: 20 }),
    set({ exerciseId: "squat", workoutId: "w2", date: "2026-11-02", weightKg: 100, reps: 5 }),
  ];

  it("garde la meilleure série de chaque séance, échauffements et séries trop longues exclus", () => {
    const history = e1rmHistory(sets);
    expect(history.bench.map((p) => p.workoutId)).toEqual(["w1", "w2"]);
    expect(history.bench[0]).toMatchObject({ weightKg: 80, reps: 8 });
    expect(history.bench[0].e1rm).toBeCloseTo(101.33, 2);
    expect(history.bench[1].e1rm).toBeCloseTo(104.5, 2);
  });

  it("classe les exercices par nombre de séances suivies", () => {
    expect(mostTrackedExercises(e1rmHistory(sets))).toEqual(["bench", "squat"]);
    expect(mostTrackedExercises(e1rmHistory(sets), 1)).toEqual(["bench"]);
  });
});

describe("semaine en cours", () => {
  it("place les séances et les jours habituels du lundi au dimanche", () => {
    const week = currentWeek("2026-11-05", ["2026-11-02", "2026-11-04", "2026-11-04", "2026-10-30"], [1, 3, 5]);
    expect(week.start).toBe("2026-11-02");
    expect(week.done).toBe(3);
    expect(week.days.map((d) => d.sessions)).toEqual([1, 0, 2, 0, 0, 0, 0]);
    expect(week.days.filter((d) => d.planned).map((d) => d.weekday)).toEqual([1, 3, 5]);
    expect(week.days.find((d) => d.isToday)?.date).toBe("2026-11-05");
    expect(week.days.filter((d) => d.isPast)).toHaveLength(3);
  });

  it("un dimanche appartient à la semaine qui finit ce jour-là", () => {
    expect(currentWeek("2026-11-08", [], []).start).toBe("2026-11-02");
  });
});
