/** Nutrition : apports d'une quantité, totaux, repas et type de jour, cibles suggérées. */

import { activityFromSessions, bmrMifflin, tdee, type Sex } from "./energy";

/** Valeurs pour 100 g, ou apports d'une quantité. */
export type Nutrients = { kcal: number; proteinG: number; carbsG: number; fatG: number };

export const NO_NUTRIENTS: Nutrients = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export const MEALS = ["petit_dejeuner", "dejeuner", "collation", "diner"] as const;
export type Meal = (typeof MEALS)[number];

export type DayType = "entrainement" | "repos";

/** Apports d'une quantité : valeur pour 100 g × grammes / 100. */
export function nutrientsFor(per100: Nutrients, grams: number): Nutrients {
  const f = Math.max(0, grams) / 100;
  return { kcal: per100.kcal * f, proteinG: per100.proteinG * f, carbsG: per100.carbsG * f, fatG: per100.fatG * f };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce(
    (sum, n) => ({ kcal: sum.kcal + n.kcal, proteinG: sum.proteinG + n.proteinG, carbsG: sum.carbsG + n.carbsG, fatG: sum.fatG + n.fatG }),
    NO_NUTRIENTS,
  );
}

/** Repas proposé selon l'heure locale : avant 10 h 30, avant 15 h, avant 18 h 30, ensuite. */
export function mealForTime(hour: number, minute = 0): Meal {
  const t = hour * 60 + minute;
  if (t < 10 * 60 + 30) return "petit_dejeuner";
  if (t < 15 * 60) return "dejeuner";
  if (t < 18 * 60 + 30) return "collation";
  return "diner";
}

/** Jour de la semaine d'une date AAAA-MM-JJ : 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Jour d'entraînement s'il fait partie des jours habituels ou si une séance y a été enregistrée. */
export function dayTypeFor(date: string, trainingDays: readonly number[], workedOut: boolean): DayType {
  return workedOut || trainingDays.includes(isoWeekday(date)) ? "entrainement" : "repos";
}

export type FoodUse = { foodId: string; grams: number; at: string };

/**
 * Aliments les plus notés, du plus fréquent au moins fréquent (à égalité, le
 * plus récent d'abord), avec la dernière quantité utilisée.
 */
export function frequentFoods(uses: FoodUse[], limit = 8): { foodId: string; count: number; lastGrams: number; lastAt: string }[] {
  const byFood = new Map<string, { foodId: string; count: number; lastGrams: number; lastAt: string }>();
  for (const u of uses) {
    const entry = byFood.get(u.foodId);
    if (!entry) byFood.set(u.foodId, { foodId: u.foodId, count: 1, lastGrams: u.grams, lastAt: u.at });
    else {
      entry.count += 1;
      if (u.at > entry.lastAt) {
        entry.lastAt = u.at;
        entry.lastGrams = u.grams;
      }
    }
  }
  return [...byFood.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt)).slice(0, limit);
}

/** Objectifs pour lesquels on vise 2 g de protéines par kg ; 1,6 g/kg pour les autres. */
export const HIGH_PROTEIN_GOALS: ReadonlySet<string> = new Set(["prise_de_masse", "seche", "recomposition", "force"]);
/** Ajustement des calories à l'objectif ; maintien pour ceux qui n'y sont pas. */
export const GOAL_FACTORS: Readonly<Record<string, number>> = { prise_de_masse: 1.1, seche: 0.8 };
/** Écart entre jour d'entraînement et jour de repos, autour de la cible moyenne. */
export const TRAINING_DAY_SPREAD = 0.05;

export type TargetSuggestion = {
  /** Dépense estimée (métabolisme de base × activité), avant ajustement à l'objectif. */
  maintenance: number;
  entrainement: { kcal: number; proteinG: number };
  repos: { kcal: number; proteinG: number };
};

const round = (value: number, step: number) => Math.round(value / step) * step;

/**
 * Cible suggérée, à titre de repère général : métabolisme de base
 * (Mifflin-St Jeor) × activité, ou la dépense réelle mesurée quand elle est
 * connue, ajusté à l'objectif, ±5 % selon le type de jour. Calories arrondies à
 * 50, protéines à 5.
 */
export function suggestTargets(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  sessionsPerWeek: number;
  goal: string | null;
  /** Dépense réelle mesurée (TDEE adaptatif) : remplace la formule quand elle est fiable. */
  maintenanceKcal?: number | null;
}): TargetSuggestion {
  const maintenance = p.maintenanceKcal ?? tdee(bmrMifflin(p), activityFromSessions(p.sessionsPerWeek));
  const base = maintenance * (GOAL_FACTORS[p.goal ?? ""] ?? 1);
  const proteinG = round(p.weightKg * (HIGH_PROTEIN_GOALS.has(p.goal ?? "") ? 2 : 1.6), 5);
  return {
    maintenance: round(maintenance, 50),
    entrainement: { kcal: round(base * (1 + TRAINING_DAY_SPREAD), 50), proteinG },
    repos: { kcal: round(base * (1 - TRAINING_DAY_SPREAD), 50), proteinG },
  };
}

export type RecipeNutrients = {
  total: Nutrients;
  /** Somme des ingrédients crus. */
  rawG: number;
  /** Poids total une fois cuit (la somme crue s'il n'est pas pesé). */
  totalG: number;
  per100: Nutrients;
  portionG: number;
  perPortion: Nutrients;
};

/**
 * Valeurs d'une recette : somme des ingrédients, ramenée à 100 g du plat cuit
 * (l'eau perdue ou gagnée change la densité, pas les apports), et à la part.
 */
export function recipeNutrients(items: readonly { grams: number; per100: Nutrients }[], totalG?: number | null, portions = 1): RecipeNutrients {
  const total = sumNutrients(items.map((i) => nutrientsFor(i.per100, i.grams)));
  const rawG = items.reduce((sum, i) => sum + Math.max(0, i.grams), 0);
  const weight = totalG && totalG > 0 ? totalG : rawG;
  const scale = (n: Nutrients, f: number): Nutrients => ({ kcal: n.kcal * f, proteinG: n.proteinG * f, carbsG: n.carbsG * f, fatG: n.fatG * f });
  const parts = Math.max(1, Math.round(portions));
  return { total, rawG, totalG: weight, per100: weight > 0 ? scale(total, 100 / weight) : NO_NUTRIENTS, portionG: weight / parts, perPortion: scale(total, 1 / parts) };
}
