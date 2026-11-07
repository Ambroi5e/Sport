import type { LoggerBlock, LoggerHistory } from "@/components/training/workout-logger";
import type { ExerciseSummary } from "@/lib/training";

/** Données d'exemple de l'aperçu de développement (captures Playwright). */

export const SAMPLE_BLOCKS: LoggerBlock[] = [
  {
    order: 0,
    exercise: { id: "ex-dc", name: "Développé couché", measure: "charge" },
    sets: [1, 2, 3, 4].map((n) => ({
      id: `dc-${n}`,
      setNumber: n,
      weightKg: 72.5,
      reps: 8,
      durationSeconds: null,
      repMin: 6,
      repMax: 10,
      isWarmup: false,
      done: n <= 2,
    })),
  },
  {
    order: 1,
    exercise: { id: "ex-ecarte", name: "Écarté à la poulie", measure: "charge" },
    sets: [1, 2, 3].map((n) => ({
      id: `ec-${n}`,
      setNumber: n,
      weightKg: 15,
      reps: 12,
      durationSeconds: null,
      repMin: 10,
      repMax: 15,
      isWarmup: false,
      done: false,
    })),
  },
  {
    order: 2,
    exercise: { id: "ex-gainage", name: "Gainage", measure: "duree" },
    sets: [1, 2].map((n) => ({ id: `ga-${n}`, setNumber: n, weightKg: null, reps: null, durationSeconds: 45, repMin: null, repMax: null, isWarmup: false, done: false })),
  },
];

export const SAMPLE_HISTORY: LoggerHistory = {
  "ex-dc": {
    records: {
      bestE1RM: { value: 92.3, weightKg: 75, reps: 7, date: "2026-10-31" },
      heaviest: { weightKg: 80, reps: 3, date: "2026-10-24" },
      mostReps: { reps: 12, weightKg: 60, date: "2026-10-10" },
      longest: null,
      bestSessionVolume: { volume: 2340, date: "2026-10-31", workoutId: "w1" },
    },
    last: [
      { weightKg: 70, reps: 8, durationSeconds: null },
      { weightKg: 70, reps: 8, durationSeconds: null },
      { weightKg: 70, reps: 7, durationSeconds: null },
      { weightKg: 70, reps: 7, durationSeconds: null },
    ],
    lastDate: "2026-11-04",
  },
};

export const SAMPLE_ITEMS = [
  { id: "i1", name: "Développé couché", timed: false, sets: 4, repMin: 6, repMax: 10 },
  { id: "i2", name: "Développé incliné haltères", timed: false, sets: 3, repMin: 8, repMax: 12 },
  { id: "i3", name: "Gainage", timed: true, sets: 2, repMin: null, repMax: null },
];

export const SAMPLE_EXERCISES: ExerciseSummary[] = [
  { id: "ex-dc", name: "Développé couché", equipment: "barre", measure: "charge", primary_muscles: ["pectoraux"], secondary_muscles: ["triceps", "epaules_avant"], user_id: null },
  { id: "ex-ecarte", name: "Écarté à la poulie", equipment: "poulie", measure: "charge", primary_muscles: ["pectoraux"], secondary_muscles: [], user_id: null },
  { id: "ex-tractions", name: "Tractions", equipment: "poids_du_corps", measure: "poids_du_corps", primary_muscles: ["dorsaux"], secondary_muscles: ["biceps"], user_id: null },
  { id: "ex-perso", name: "Pull-over à la machine du club", equipment: "machine", measure: "charge", primary_muscles: ["dorsaux"], secondary_muscles: [], user_id: "moi" },
];

export const SAMPLE_VOLUME: Record<string, number> = { pectoraux: 12, triceps: 6, epaules_avant: 4, epaules_laterales: 9, dorsaux: 22, biceps: 5 };
