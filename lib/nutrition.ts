/** Nutrition : libellés, aliments tels que les écrans les lisent, formats. */
import type { DayType, Meal, Nutrients } from "@/lib/engine";
import { MEALS } from "@/lib/engine";

export const MEAL_LABELS: Record<Meal, string> = {
  petit_dejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};

/** « au petit-déjeuner », « au dîner » : pour les boutons. */
export const MEAL_TO: Record<Meal, string> = {
  petit_dejeuner: "au petit-déjeuner",
  dejeuner: "au déjeuner",
  collation: "à la collation",
  diner: "au dîner",
};

/** « du petit-déjeuner », « de la collation » : pour retirer. */
export const MEAL_FROM: Record<Meal, string> = {
  petit_dejeuner: "du petit-déjeuner",
  dejeuner: "du déjeuner",
  collation: "de la collation",
  diner: "du dîner",
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  entrainement: "Jour d'entraînement",
  repos: "Jour de repos",
};

export const WEEKDAYS = [
  { n: 1, short: "Lun", label: "lundi" },
  { n: 2, short: "Mar", label: "mardi" },
  { n: 3, short: "Mer", label: "mercredi" },
  { n: 4, short: "Jeu", label: "jeudi" },
  { n: 5, short: "Ven", label: "vendredi" },
  { n: 6, short: "Sam", label: "samedi" },
  { n: 7, short: "Dim", label: "dimanche" },
] as const;

export type Food = {
  id: string;
  name: string;
  brand: string | null;
  per100: Nutrients;
  portionG: number | null;
  portionLabel: string | null;
  personal: boolean;
};

export type FoodRow = {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion_g: number | null;
  portion_label: string | null;
};

export const FOOD_COLUMNS = "id, user_id, name, brand, kcal, protein_g, carbs_g, fat_g, portion_g, portion_label";

export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    per100: { kcal: Number(row.kcal), proteinG: Number(row.protein_g), carbsG: Number(row.carbs_g), fatG: Number(row.fat_g) },
    portionG: row.portion_g === null ? null : Number(row.portion_g),
    portionLabel: row.portion_label,
    personal: row.user_id !== null,
  };
}

export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 1 850 » */
export function formatKcal(kcal: number): string {
  return integer.format(Math.round(kcal));
}

/** Macros : entier au-delà de 10 g, une décimale en dessous (« 8,5 », « 42 »). */
export function formatMacro(grams: number): string {
  return grams >= 10 ? integer.format(Math.round(grams)) : oneDecimal.format(Math.round(grams * 10) / 10);
}

/** Quantité : « 150 g », « 12,5 g ». */
export function formatGrams(grams: number): string {
  return `${oneDecimal.format(Math.round(grams * 10) / 10)} g`;
}

/** Lien vers un jour du journal (sans paramètre pour aujourd'hui), avec l'ancre du repas. */
export function dayHref(day: string, today: string, meal?: Meal): string {
  return `/nutrition${day === today ? "" : `?jour=${day}`}${meal ? `#${meal}` : ""}`;
}

/** Paramètres des écrans d'ajout : le repas, et le jour s'il n'est pas aujourd'hui. */
export function addParams(meal: Meal, day: string, today: string): string {
  const params = new URLSearchParams({ repas: meal });
  if (day !== today) params.set("jour", day);
  return params.toString();
}

/** « Aujourd'hui », « Hier », sinon « Lundi 9 novembre ». */
export function dayLabel(day: string, today: string, yesterday: string): string {
  if (day === today) return "Aujourd'hui";
  if (day === yesterday) return "Hier";
  const long = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  return long.charAt(0).toUpperCase() + long.slice(1);
}

/** Cible d'un type de jour : glucides et lipides facultatifs. */
export type Target = { kcal: number; proteinG: number; carbsG: number | null; fatG: number | null };

/** Une ligne du journal, avec ses apports calculés à la lecture. */
export type JournalEntry = { id: string; meal: Meal; grams: number; food: Food; nutrients: Nutrients };

/** Libellé d'un raccourci de portion : « 1 bol (40 g) » garde son poids, sinon on l'ajoute. */
export function portionChip(label: string, grams: number): string {
  return /\d\s*g\b/.test(label) ? label : `${label} · ${formatGrams(grams)}`;
}
