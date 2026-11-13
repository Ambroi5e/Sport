import type { ProgramViewData } from "@/components/training/program-view";
import type { LoggerBlock, LoggerHistory } from "@/components/training/workout-logger";
import {
  buildProgram,
  e1rmHistory,
  nutrientsFor,
  plannedSetsPerMuscle,
  programWeek,
  projectE1RM,
  sumNutrients,
  parseNutritionLabel,
  type AdaptiveTdee,
  type CatalogExercise,
  type DayType,
  type Meal,
  type SetEntry,
  type WeighIn,
  activitiesKcal,
  weightOn,
  type DatedCheckin,
  planWeek,
  trainingLoad,
  SPORT_EFFORT,
  STRENGTH_EFFORT,
  type LoadEntry,
  type PlanInput,
} from "@/lib/engine";
import type { WeeklySportRow } from "@/components/training/week-type-view";
import type { Activity } from "@/app/(app)/entrainement/sports/data";
import type { MeasurementRow, Photo, PhotoPose } from "@/lib/body";
import type { Food, JournalEntry, Target } from "@/lib/nutrition";
import { fromOpenFoodFacts } from "@/lib/openfoodfacts";
import { PORTION_LABEL, recipeRow } from "@/lib/recipes";
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
  recipe: false,
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

// Recettes (v0.6.1) : ingrédients crus, valeurs calculées comme à l'enregistrement.
const RAW = {
  poulet: food("f-poulet-cru", "Blanc de poulet cru", 110, 23, 0, 1.5),
  riz: food("f-riz-cru", "Riz basmati cru", 350, 7.5, 78, 0.9),
  coco: food("f-coco", "Lait de coco", 180, 1.8, 3, 18),
  oignon: food("f-oignon", "Oignon", 40, 1.2, 8, 0.1),
  tomates: food("f-tomates", "Tomates concassées", 25, 1.2, 4, 0.2),
  huile: SAMPLE_FOODS.find((f) => f.id === "f-huile")!,
};

export const SAMPLE_INGREDIENTS: Food[] = [...SAMPLE_FOODS.filter((f) => f.id !== "f-granola"), ...Object.values(RAW).filter((f) => f.id !== "f-huile")];

export const SAMPLE_RECIPE = {
  name: "Poulet curry du dimanche",
  portions: 5,
  cookedG: 2600,
  items: [
    { food: RAW.poulet, grams: 800 },
    { food: RAW.riz, grams: 400 },
    { food: RAW.coco, grams: 400 },
    { food: RAW.tomates, grams: 400 },
    { food: RAW.oignon, grams: 150 },
    { food: RAW.huile, grams: 20 },
  ],
};

function recipeFood(id: string, name: string, items: { food: Food; grams: number }[], cookedG: number | null, portions: number): Food {
  const r = recipeRow(items.map((i) => ({ grams: i.grams, per100: i.food.per100 })), cookedG, portions);
  if (!r.ok) throw new Error(r.error);
  return {
    id,
    name,
    brand: null,
    per100: { kcal: r.row.kcal, proteinG: r.row.protein_g, carbsG: r.row.carbs_g, fatG: r.row.fat_g },
    portionG: r.row.portion_g,
    portionLabel: PORTION_LABEL,
    personal: true,
    recipe: true,
  };
}

const CURRY = recipeFood("r-curry", SAMPLE_RECIPE.name, SAMPLE_RECIPE.items, SAMPLE_RECIPE.cookedG, SAMPLE_RECIPE.portions);

export const SAMPLE_RECIPES = [
  { food: CURRY, portions: 5 },
  {
    food: recipeFood("r-chili", "Chili con carne", [{ food: food("x-boeuf", "Bœuf haché 5 %", 125, 21, 0, 5), grams: 600 }, { food: food("x-haricots", "Haricots rouges cuits", 115, 8, 16, 0.5), grams: 500 }, { food: RAW.tomates, grams: 800 }, { food: RAW.oignon, grams: 200 }], 1900, 6),
    portions: 6,
  },
  {
    food: recipeFood("r-oats", "Overnight oats protéinés", [{ food: SAMPLE_FOODS[0], grams: 80 }, { food: SAMPLE_FOODS[1], grams: 150 }, { food: SAMPLE_FOODS.find((f) => f.id === "f-whey")!, grams: 30 }], null, 1),
    portions: 1,
  },
];

export const SAMPLE_REAL_TDEE: AdaptiveTdee = {
  ok: true,
  kcal: 3180,
  intake: 2950,
  weeklyChangeKg: -0.21,
  countedDays: 25,
  loggedDays: 26,
  weighIns: 18,
  weightSpanDays: 27,
  from: "2026-10-10",
  to: "2026-11-06",
};

export const SAMPLE_REAL_TDEE_WAITING: AdaptiveTdee = {
  ok: false,
  reason: "jours",
  countedDays: 9,
  loggedDays: 11,
  weighIns: 3,
  weightSpanDays: 12,
  from: "2026-10-10",
  to: "2026-11-06",
};

// Code-barres et étiquette (v0.6.2) : une fiche Open Food Facts type, et le texte lu par Tesseract.
export const SAMPLE_OFF = fromOpenFoodFacts({
  product_name: "Flocons d'avoine complets",
  brands: "Bjorg",
  nutriments: { "energy-kcal_100g": 372, proteins_100g: 13.5, carbohydrates_100g: 58.7, fat_100g: 7 },
  serving_quantity: 40,
  serving_size: "40 g",
})!;

export const SAMPLE_OFF_PREFILL = {
  name: SAMPLE_OFF.name,
  brand: SAMPLE_OFF.brand ?? undefined,
  kcal: "372",
  proteinG: "13,5",
  carbsG: "58,7",
  fatG: "7",
  portionLabel: SAMPLE_OFF.portion?.label,
  portionG: "40",
};

export const SAMPLE_LABEL = parseNutritionLabel(
  ["Énergie 1576 kJ 630 kJ", "374 kcal 150 kcal", "Matières grasses 6,9 g 2,89", "Glucides 58,7 g 239", "dont sucres 11g 04g", "Protéines 13,5g 5,4g", "Sel 0,02 g <0,01 g"].join("\n"),
);

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

// Programme (v0.6) ------------------------------------------------------------------

const cx = (id: string, name: string, equipment: string, primary: string[], secondary: string[] = [], measure = "charge"): CatalogExercise => ({
  id,
  name,
  equipment,
  measure,
  primary,
  secondary,
});

/** Un extrait du catalogue commun, assez pour générer un programme haut / bas. */
export const SAMPLE_CATALOG: CatalogExercise[] = [
  cx("ex-dc", "Développé couché", "barre", ["pectoraux"], ["triceps", "epaules_avant"]),
  cx("ex-dc-halteres", "Développé couché haltères", "halteres", ["pectoraux"], ["triceps", "epaules_avant"]),
  cx("ex-incline", "Développé incliné", "barre", ["pectoraux"], ["epaules_avant", "triceps"]),
  cx("ex-ecarte", "Écarté à la poulie", "poulie", ["pectoraux"], ["epaules_avant"]),
  cx("ex-rowing", "Rowing barre", "barre", ["dorsaux"], ["trapezes", "epaules_arriere", "biceps", "lombaires"]),
  cx("ex-rowing-haltere", "Rowing haltère un bras", "halteres", ["dorsaux"], ["epaules_arriere", "biceps"]),
  cx("ex-tirage", "Tirage vertical", "poulie", ["dorsaux"], ["biceps", "epaules_arriere"]),
  cx("ex-tirage-h", "Tirage horizontal", "poulie", ["dorsaux"], ["trapezes", "biceps", "epaules_arriere"]),
  cx("ex-militaire", "Développé militaire", "barre", ["epaules_avant"], ["epaules_laterales", "triceps"]),
  cx("ex-dev-assis", "Développé haltères assis", "halteres", ["epaules_avant"], ["epaules_laterales", "triceps"]),
  cx("ex-laterales", "Élévations latérales", "halteres", ["epaules_laterales"]),
  cx("ex-laterales-poulie", "Élévations latérales à la poulie", "poulie", ["epaules_laterales"]),
  cx("ex-face-pull", "Face pull", "poulie", ["epaules_arriere"], ["trapezes"]),
  cx("ex-curl", "Curl haltères", "halteres", ["biceps"], ["avant_bras"]),
  cx("ex-curl-poulie", "Curl à la poulie", "poulie", ["biceps"]),
  cx("ex-triceps", "Extension triceps à la corde", "poulie", ["triceps"]),
  cx("ex-barre-front", "Barre au front", "barre", ["triceps"]),
  cx("ex-squat", "Squat", "barre", ["quadriceps", "fessiers"], ["adducteurs", "lombaires"]),
  cx("ex-squat-avant", "Squat avant", "barre", ["quadriceps"], ["fessiers", "abdominaux"]),
  cx("ex-presse", "Presse à cuisses", "machine", ["quadriceps", "fessiers"], ["adducteurs"]),
  cx("ex-sdt", "Soulevé de terre", "barre", ["ischios", "fessiers", "lombaires"], ["dorsaux", "trapezes", "quadriceps", "avant_bras"]),
  cx("ex-roumain", "Soulevé de terre roumain", "barre", ["ischios", "fessiers"], ["lombaires", "avant_bras"]),
  cx("ex-leg-curl", "Leg curl assis", "machine", ["ischios"]),
  cx("ex-hip-thrust", "Hip thrust", "barre", ["fessiers"], ["ischios"]),
  cx("ex-mollets", "Mollets debout", "machine", ["mollets"]),
  cx("ex-crunch", "Crunch à la poulie", "poulie", ["abdominaux"]),
];

const programSessions = buildProgram(SAMPLE_CATALOG, {
  sessionsPerWeek: 4,
  sessionMinutes: 60,
  equipment: ["barre", "halteres", "machine", "poulie", "poids_du_corps"],
  priority: ["epaules_laterales"],
  goalExerciseId: "ex-dc",
});
const catalogName = Object.fromEntries(SAMPLE_CATALOG.map((e) => [e.id, e.name]));
const sessionViews = programSessions.map((s, i) => ({
  id: `seance-${i}`,
  name: s.name,
  items: s.items.map((it, k) => ({ id: `item-${i}-${k}`, name: catalogName[it.exerciseId], sets: it.sets, repMin: it.repMin, repMax: it.repMax })),
}));
const dcHistory = e1rmHistory(SAMPLE_SETS)["ex-dc"].map((h) => ({ date: h.date, e1rm: h.e1rm }));

export const SAMPLE_PROGRAM: ProgramViewData = {
  id: "programme",
  name: "Haut / bas, 4 séances",
  startsOn: "2026-10-13",
  weeks: 12,
  deloadEvery: 5,
  sessionMinutes: 60,
  equipment: ["barre", "halteres", "machine", "poulie", "poids_du_corps"],
  priority: ["epaules_laterales"],
  week: programWeek("2026-10-13", SAMPLE_DAY),
  deload: false,
  today: SAMPLE_DAY,
  next: {
    session: sessionViews[2],
    suggestions: {
      "item-2-0": "87,5 kg × 6, charge en hausse",
      "item-2-1": "62 kg, une rep de plus",
      "item-2-2": "12 kg, une rep de plus",
      "item-2-3": "14 kg × 10, charge en hausse",
      "item-2-4": "17,5 kg, une rep de plus",
    },
  },
  sessions: sessionViews,
  planned: plannedSetsPerMuscle(programSessions, SAMPLE_CATALOG),
  goal: {
    exerciseName: "Développé couché",
    kg: 120,
    date: "2027-05-01",
    history: dcHistory,
    projection: projectE1RM({ history: dcHistory, today: SAMPLE_DAY, targetKg: 120, level: "intermediaire", startsOn: "2026-10-13", deloadEvery: 5 }),
  },
};

export const SAMPLE_REPLACE = [
  { id: "ex-dc-halteres", name: "Développé couché haltères", detail: "Haltères · Pectoraux", liked: true },
  { id: "ex-incline", name: "Développé incliné", detail: "Barre · Pectoraux", liked: false },
  { id: "ex-presse-pec", name: "Presse à pectoraux", detail: "Machine · Pectoraux", liked: false },
  { id: "ex-ecarte", name: "Écarté à la poulie", detail: "Poulie · Pectoraux", liked: false },
];

const activityRows: Omit<Activity, "kcal" | "weightKg">[] = [
  { id: "act-1", date: "2026-11-04", sport: "padel", label: null, minutes: 90, intensity: "intense" },
  { id: "act-2", date: "2026-11-01", sport: "foot", label: null, minutes: 60, intensity: "moderee" },
  { id: "act-3", date: "2026-10-28", sport: "padel", label: null, minutes: 90, intensity: "moderee" },
  { id: "act-4", date: "2026-10-25", sport: "escalade", label: null, minutes: 120, intensity: "legere" },
  { id: "act-5", date: "2026-10-21", sport: "padel", label: null, minutes: 90, intensity: "intense" },
  { id: "act-6", date: "2026-10-18", sport: "autre", label: "Paddle", minutes: 60, intensity: "legere" },
];
const activityKcal = activitiesKcal(activityRows, SAMPLE_WEIGHTS);

/** Sports des trois dernières semaines, avec la dépense calculée comme dans l'app. */
export const SAMPLE_ACTIVITIES: Activity[] = activityRows.map((a, i) => ({ ...a, kcal: activityKcal[i], weightKg: weightOn(SAMPLE_WEIGHTS, a.date) }));

/** Note entre 1 et 5 qui ondule d'un jour à l'autre. */
function note(i: number, base: number, swing: number): number {
  return Math.min(5, Math.max(1, Math.round(base + wobble(i) * swing)));
}

/** 75 jours de check-ins (quelques oublis), avec une semaine plus difficile il y a trois semaines. */
export const SAMPLE_CHECKINS: DatedCheckin[] = Array.from({ length: 75 }, (_, i) => {
  const daysAgo = 74 - i;
  const rough = daysAgo >= 18 && daysAgo <= 24;
  return {
    date: shiftDay(SAMPLE_DAY, -daysAgo),
    sleep: note(i, rough ? 2.2 : 3.8, 1.2),
    soreness: note(i + 3, rough ? 3.8 : 2.4, 1.3),
    energy: note(i + 7, rough ? 2.4 : 3.7, 1.1),
    stress: note(i + 11, rough ? 3.6 : 2.3, 1.2),
  };
}).filter((_, i) => i % 6 !== 2 || i === 74);

/** Ma semaine : jeudi 5 novembre, Bas A faite lundi, Haut A ratée mardi, padel le mercredi, foot le dimanche. */
export const SAMPLE_PLAN_DAY = "2026-11-05";

const UPPER = ["dorsaux", "epaules_avant", "pectoraux"];
const LOWER = ["fessiers", "ischios", "quadriceps"];

export const SAMPLE_WEEKLY_SPORTS: WeeklySportRow[] = [
  { id: "ws-1", weekday: 3, sport: "padel", label: null, minutes: 90, intensity: "intense" },
  { id: "ws-2", weekday: 7, sport: "foot", label: null, minutes: 60, intensity: "moderee" },
];

export const SAMPLE_PLAN_INPUT: PlanInput = {
  today: SAMPLE_PLAN_DAY,
  sessions: [
    { id: "seance-0", name: "Haut A", muscles: UPPER },
    { id: "seance-1", name: "Bas A", muscles: LOWER },
    { id: "seance-2", name: "Haut B", muscles: UPPER },
    { id: "seance-3", name: "Bas B", muscles: LOWER },
  ],
  lastDoneBeforeWeek: "seance-0",
  availableDays: [1, 2, 4, 5, 6],
  workouts: [{ date: "2026-11-02", templateId: "seance-1", name: "Bas A", muscles: LOWER }],
  activities: [
    { date: "2026-11-01", sport: "foot", label: null, minutes: 60, intensity: "moderee" },
    { date: "2026-11-04", sport: "padel", label: null, minutes: 90, intensity: "intense" },
  ],
  weeklySports: SAMPLE_WEEKLY_SPORTS,
  pins: [],
  blocked: [],
};

export const SAMPLE_PLAN = planWeek(SAMPLE_PLAN_INPUT);

/** Quatre semaines régulières, puis une semaine plus chargée : la charge ressort en hausse. */
const loadEntries: LoadEntry[] = Array.from({ length: 4 }, (_, week) => {
  const monday = shiftDay("2026-11-02", -7 * week);
  return [
    { date: monday, minutes: week === 0 ? 85 : 65, effort: STRENGTH_EFFORT },
    { date: shiftDay(monday, 1), minutes: week === 0 ? 0 : 60, effort: STRENGTH_EFFORT },
    { date: shiftDay(monday, 2), minutes: 90, effort: SPORT_EFFORT[week === 0 ? "intense" : "moderee"] },
    { date: shiftDay(monday, -1), minutes: 60, effort: SPORT_EFFORT.moderee },
    { date: shiftDay(monday, -3), minutes: 65, effort: STRENGTH_EFFORT },
  ];
}).flat();

export const SAMPLE_LOAD = trainingLoad(loadEntries, SAMPLE_PLAN_DAY);
