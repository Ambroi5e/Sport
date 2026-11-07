import type { LoggerBlock, LoggerHistory } from "@/components/training/workout-logger";
import { nutrientsFor, sumNutrients, type DayType, type Meal, type SetEntry, type WeighIn } from "@/lib/engine";
import type { MeasurementRow, Photo, PhotoPose } from "@/lib/body";
import type { Food, JournalEntry, Target } from "@/lib/nutrition";
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
      completedAt: n <= 2 ? "2026-11-07T18:0" + n + ":00.000Z" : null,
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
      completedAt: null,
    })),
  },
  {
    order: 2,
    exercise: { id: "ex-gainage", name: "Gainage", measure: "duree" },
    sets: [1, 2].map((n) => ({ id: `ga-${n}`, setNumber: n, weightKg: null, reps: null, durationSeconds: 45, repMin: null, repMax: null, isWarmup: false, done: false, completedAt: null })),
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

// Nutrition ------------------------------------------------------------------------

const food = (id: string, name: string, kcal: number, proteinG: number, carbsG: number, fatG: number, portion?: [number, string], personal = false): Food => ({
  id,
  name,
  brand: null,
  per100: { kcal, proteinG, carbsG, fatG },
  portionG: portion?.[0] ?? null,
  portionLabel: portion?.[1] ?? null,
  personal,
});

export const SAMPLE_FOODS: Food[] = [
  food("f-avoine", "Flocons d'avoine", 370, 13.5, 58.7, 7, [40, "1 bol (40 g)"]),
  food("f-skyr", "Skyr nature", 60, 10.5, 4, 0.2, [150, "1 pot (150 g)"]),
  food("f-banane", "Banane", 90, 1.1, 20, 0.3, [120, "1 banane (120 g)"]),
  food("f-poulet", "Blanc de poulet cuit", 150, 30, 0, 3),
  food("f-riz", "Riz basmati cuit", 130, 2.7, 28, 0.3),
  food("f-brocoli", "Brocoli cuit", 30, 2.8, 4, 0.4),
  food("f-huile", "Huile d'olive", 900, 0, 0, 100, [10, "1 c. à soupe (10 g)"]),
  food("f-oeuf", "Œuf entier cuit", 140, 12.5, 0.7, 9.5, [55, "1 œuf (55 g)"]),
  food("f-saumon", "Saumon cuit", 200, 22, 0, 12.5),
  food("f-pates", "Pâtes cuites", 150, 5.3, 30, 0.9),
  food("f-whey", "Whey vanille", 380, 78, 7, 5, [30, "1 dose (30 g)"], true),
  food("f-granola", "Granola maison", 450, 12, 55, 18, [50, "1 bol (50 g)"], true),
];

const byId = Object.fromEntries(SAMPLE_FOODS.map((f) => [f.id, f]));
const entry = (id: string, meal: Meal, foodId: string, grams: number): JournalEntry => ({
  id,
  meal,
  grams,
  food: byId[foodId],
  nutrients: nutrientsFor(byId[foodId].per100, grams),
});

export const SAMPLE_TODAY: JournalEntry[] = [
  entry("j-1", "petit_dejeuner", "f-avoine", 80),
  entry("j-2", "petit_dejeuner", "f-skyr", 150),
  entry("j-3", "petit_dejeuner", "f-banane", 120),
  entry("j-4", "dejeuner", "f-poulet", 180),
  entry("j-5", "dejeuner", "f-riz", 250),
  entry("j-6", "dejeuner", "f-brocoli", 150),
  entry("j-7", "dejeuner", "f-huile", 10),
  entry("j-8", "collation", "f-whey", 30),
];

export const SAMPLE_YESTERDAY: JournalEntry[] = [
  entry("h-1", "diner", "f-saumon", 160),
  entry("h-2", "diner", "f-pates", 280),
  entry("h-3", "diner", "f-brocoli", 150),
];

export const SAMPLE_TARGETS: Record<DayType, Target> = {
  entrainement: { kcal: 3150, proteinG: 150, carbsG: null, fatG: null },
  repos: { kcal: 2850, proteinG: 150, carbsG: null, fatG: null },
};

export const SAMPLE_FAVORITES = [
  { id: "fav-1", name: "Mon petit-déj", itemCount: 3, totals: sumNutrients(SAMPLE_TODAY.slice(0, 3).map((e) => e.nutrients)) },
  { id: "fav-2", name: "Post-séance", itemCount: 2, totals: sumNutrients([nutrientsFor(byId["f-whey"].per100, 30), nutrientsFor(byId["f-banane"].per100, 120)]) },
];

export const SAMPLE_FREQUENT = [
  { food: byId["f-avoine"], grams: 80 },
  { food: byId["f-skyr"], grams: 150 },
  { food: byId["f-poulet"], grams: 180 },
  { food: byId["f-riz"], grams: 250 },
  { food: byId["f-whey"], grams: 30 },
];

// Progrès (v0.5) ------------------------------------------------------------------

export const SAMPLE_DAY = "2026-11-07";

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bruit déterministe entre -1 et 1. */
function wobble(i: number): number {
  return Math.sin(i * 12.9898) * 0.6 + Math.sin(i * 4.1) * 0.4;
}

/**
 * 110 jours de pesées (quelques oublis) : prise de masse dans la cible, puis
 * trois semaines trop rapides pour montrer l'alerte.
 */
export const SAMPLE_WEIGHTS: WeighIn[] = Array.from({ length: 110 }, (_, i) => {
  const daysAgo = 109 - i;
  const slow = Math.min(i, 89) * (0.32 / 7);
  const fast = Math.max(0, i - 89) * (0.75 / 7);
  return { date: shiftDay(SAMPLE_DAY, -daysAgo), kg: Math.round((80.2 + slow + fast + wobble(i) * 0.35) * 10) / 10 };
})
  .filter((_, i) => i % 9 !== 4)
  .reverse();

export const SAMPLE_MEASUREMENTS: MeasurementRow[] = [
  ...(
    [
      ["2026-09-05", { cou: 39, epaules: 118, poitrine: 101, bras: 36.5, avant_bras: 29.5, taille: 81, hanches: 96, cuisse: 57, mollet: 37.5 }],
      ["2026-10-04", { cou: 39.5, epaules: 119.5, poitrine: 102.5, bras: 37.2, avant_bras: 30, taille: 81.5, hanches: 96.5, cuisse: 58, mollet: 37.5 }],
      ["2026-11-02", { epaules: 120.5, poitrine: 103.5, bras: 38, avant_bras: 30.2, taille: 82.5, cuisse: 58.8, mollet: 38 }],
    ] as const
  ).flatMap(([date, values]) => Object.entries(values).map(([site, cm]) => ({ date, site: site as MeasurementRow["site"], cm }))),
];

/** Silhouette d'exemple en SVG : aucune vraie photo dans le dépôt. */
function silhouette(pose: PhotoPose, shade: number, width: number): string {
  const body =
    pose === "profil"
      ? `<ellipse cx="150" cy="95" rx="34" ry="40"/><path d="M128 140h44c10 40 14 90 8 140l-6 120h-46l-8-120c-6-50-2-100 8-140z"/>`
      : `<ellipse cx="150" cy="95" rx="38" ry="44"/><path d="M${150 - width} 150c-14 0-24 10-26 24l-8 116h${width * 0.5}l6 110h${width * 1.5 + 12}l6-110h${width * 0.5}l-8-116c-2-14-12-24-26-24z"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="hsl(30 8% ${18 + shade}%)"/><g fill="hsl(30 10% ${42 + shade}%)">${body}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PHOTOS: Photo[] = (
  [
    ["2026-11-02", 6, 64],
    ["2026-10-04", 3, 60],
    ["2026-09-05", 0, 56],
  ] as const
).flatMap(([date, shade, width], d) =>
  (["face", "profil", "dos"] as const).map((pose, i) => ({
    id: `00000000-0000-4000-8000-00000000${d}${i}00`,
    takenOn: date,
    pose,
    path: `exemple/${date}-${pose}.jpg`,
    url: silhouette(pose, shade, width),
  })),
);

export const SAMPLE_EXERCISE_NAMES: Record<string, string> = {
  "ex-dc": "Développé couché",
  "ex-squat": "Squat",
  "ex-sdt": "Soulevé de terre",
  "ex-rowing": "Rowing barre",
  "ex-ecarte": "Écarté à la poulie",
};

/** Douze semaines de séances : trois par semaine, charges en progression lente. */
export const SAMPLE_SETS: SetEntry[] = Array.from({ length: 12 * 3 }, (_, n) => {
  const week = Math.floor(n / 3);
  const slot = n % 3;
  const date = shiftDay("2026-08-17", week * 7 + [0, 2, 4][slot]);
  return { n, week, slot, date };
})
  .filter(({ date }) => date <= SAMPLE_DAY && !(date >= "2026-10-05" && date <= "2026-10-11" && date !== "2026-10-05"))
  .flatMap(({ n, week, slot, date }) => {
    const workoutId = `w-${n}`;
    const lifts =
      slot === 0
        ? [["ex-dc", 70 + week * 1.25, 8], ["ex-ecarte", 15, 12]]
        : slot === 1
          ? [["ex-squat", 95 + week * 2.5, 6], ["ex-rowing", 60 + week, 10]]
          : [["ex-sdt", 120 + week * 2.5, 5], ["ex-dc", 65 + week, 10]];
    return lifts.flatMap(([exerciseId, kg, reps]) =>
      [1, 2, 3, 4].map((s) => ({
        exerciseId: exerciseId as string,
        workoutId,
        date,
        weightKg: Math.round((kg as number) * 2) / 2,
        reps: (reps as number) - (s === 4 ? 1 : 0),
        isWarmup: false,
      })),
    );
  });
