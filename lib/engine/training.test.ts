import { describe, expect, it } from "vitest";
import {
  bestSet,
  exerciseRecords,
  newRecords,
  prefillSets,
  setE1RM,
  setsPerMuscle,
  setVolume,
  totalVolume,
  volumeZone,
  type SetEntry,
} from ".";

function set(partial: Partial<SetEntry>): SetEntry {
  return { exerciseId: "bench", workoutId: "w1", date: "2026-11-01", weightKg: 80, reps: 8, ...partial };
}

describe("volume", () => {
  it("multiplie charge et répétitions, sans compter les échauffements", () => {
    expect(setVolume({ weightKg: 80, reps: 10 })).toBe(800);
    expect(setVolume({ weightKg: null, reps: 12 })).toBe(0);
    expect(totalVolume([set({ reps: 10 }), set({ reps: 10, isWarmup: true }), set({ weightKg: 60, reps: 5 })])).toBe(1100);
  });
});

describe("1RM estimé", () => {
  it("ne compte que les séries de 1 à 12 répétitions avec charge", () => {
    expect(setE1RM({ weightKg: 100, reps: 1 })).toBe(100);
    expect(setE1RM({ weightKg: 80, reps: 10 })).toBeCloseTo(106.67, 2);
    expect(setE1RM({ weightKg: 40, reps: 20 })).toBeNull();
    expect(setE1RM({ weightKg: null, reps: 8 })).toBeNull();
  });
});

describe("records", () => {
  const history = [
    set({ date: "2026-10-20", workoutId: "a", weightKg: 75, reps: 10 }),
    set({ date: "2026-10-20", workoutId: "a", weightKg: 75, reps: 9 }),
    set({ date: "2026-10-27", workoutId: "b", weightKg: 80, reps: 8 }),
    set({ date: "2026-10-27", workoutId: "b", weightKg: 80, reps: 8 }),
    set({ date: "2026-10-30", workoutId: "c", weightKg: 60, reps: 25 }),
    set({ date: "2026-10-31", workoutId: "d", weightKg: 120, reps: 3, isWarmup: true }),
  ];

  it("trouve le meilleur 1RM estimé, la charge max et le meilleur volume de séance", () => {
    const r = exerciseRecords(history);
    expect(r.bestE1RM?.value).toBeCloseTo(101.33, 2);
    expect(r.bestE1RM?.date).toBe("2026-10-27");
    expect(r.heaviest).toEqual({ weightKg: 80, reps: 8, date: "2026-10-27" });
    expect(r.mostReps?.reps).toBe(25);
    expect(r.bestSessionVolume).toEqual({ volume: 1500, date: "2026-10-30", workoutId: "c" });
  });

  it("garde le record le plus ancien à égalité", () => {
    const r = exerciseRecords([set({ date: "2026-11-02", weightKg: 80, reps: 8 }), set({ date: "2026-10-01", weightKg: 80, reps: 8 })]);
    expect(r.bestE1RM?.date).toBe("2026-10-01");
  });

  it("détecte un nouveau record de 1RM estimé et de charge", () => {
    const previous = exerciseRecords(history);
    expect(newRecords(previous, set({ weightKg: 82.5, reps: 8 }))).toEqual(["e1rm", "charge"]);
    expect(newRecords(previous, set({ weightKg: 80, reps: 9 }))).toEqual(["e1rm"]);
    expect(newRecords(previous, set({ weightKg: 80, reps: 8 }))).toEqual([]);
    expect(newRecords(previous, set({ weightKg: 100, reps: 2, isWarmup: true }))).toEqual([]);
  });

  it("ne crie pas au record la première fois", () => {
    expect(newRecords(exerciseRecords([]), set({ weightKg: 100, reps: 5 }))).toEqual([]);
  });

  it("compte un record de répétitions seulement sans charge", () => {
    const previous = exerciseRecords([set({ exerciseId: "pull", weightKg: null, reps: 10 })]);
    expect(newRecords(previous, set({ exerciseId: "pull", weightKg: null, reps: 11 }))).toEqual(["reps"]);
  });

  it("compte un record de durée pour le gainage", () => {
    const previous = exerciseRecords([set({ weightKg: null, reps: null, durationSeconds: 60 })]);
    expect(newRecords(previous, set({ weightKg: null, reps: null, durationSeconds: 75 }))).toEqual(["duree"]);
  });

  it("choisit la meilleure série d'une séance", () => {
    const sets = [set({ weightKg: 80, reps: 8 }), set({ weightKg: 85, reps: 5 }), set({ weightKg: 100, reps: 1, isWarmup: true })];
    expect(bestSet(sets)?.weightKg).toBe(80);
  });
});

describe("volume par muscle", () => {
  const muscles = {
    bench: { primary: ["pectoraux"], secondary: ["triceps", "epaules_avant"] },
    curl: { primary: ["biceps"], secondary: [] },
  };

  it("compte 1 pour un muscle principal et 0,5 pour un secondaire", () => {
    const out = setsPerMuscle(
      [set({}), set({}), set({}), set({ exerciseId: "curl" }), set({ exerciseId: "curl", isWarmup: true }), set({ exerciseId: "inconnu" })],
      muscles,
    );
    expect(out).toEqual({ pectoraux: 3, triceps: 1.5, epaules_avant: 1.5, biceps: 1 });
  });

  it("situe le volume par rapport au repère de 10 à 20 séries", () => {
    expect(volumeZone(6)).toBe("bas");
    expect(volumeZone(10)).toBe("repere");
    expect(volumeZone(20)).toBe("repere");
    expect(volumeZone(22.5)).toBe("haut");
  });
});

describe("préremplissage", () => {
  it("reprend la dernière performance série par série", () => {
    const out = prefillSets(
      [
        { setNumber: 2, weightKg: 80, reps: 9 },
        { setNumber: 1, weightKg: 80, reps: 10 },
      ],
      { sets: 3, repMin: 8, repMax: 12 },
    );
    expect(out.map((s) => [s.setNumber, s.weightKg, s.reps])).toEqual([
      [1, 80, 10],
      [2, 80, 9],
      [3, 80, 9],
    ]);
    expect(out[0].repMax).toBe(12);
  });

  it("part de la cible du modèle sans historique, sinon de 3 séries vides", () => {
    expect(prefillSets([], { sets: 2, repMin: 8, repMax: 12 }).map((s) => [s.weightKg, s.reps])).toEqual([
      [null, 8],
      [null, 8],
    ]);
    expect(prefillSets([])).toHaveLength(3);
  });
});
