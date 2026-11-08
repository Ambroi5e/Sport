import type { Intensity } from "@/lib/engine";
import type { Enums } from "@/lib/supabase/database.types";

export type Sport = Enums<"activity_sport">;

export const SPORT_LABELS: Record<Sport, string> = {
  padel: "Padel",
  tennis: "Tennis",
  squash: "Squash",
  badminton: "Badminton",
  foot: "Foot",
  basket: "Basket",
  handball: "Handball",
  rugby: "Rugby",
  volley: "Volley",
  escalade: "Escalade",
  combat: "Sports de combat",
  autre: "Autre",
};

export const SPORTS = Object.keys(SPORT_LABELS) as Sport[];

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && value in SPORT_LABELS;
}

/** Le test de la parole : plus parlant qu'une note sur 10 après un match. */
export const INTENSITY_LABELS: Record<Intensity, { label: string; hint: string }> = {
  legere: { label: "Légère", hint: "on parle sans peine" },
  moderee: { label: "Modérée", hint: "on parle par phrases courtes" },
  intense: { label: "Intense", hint: "quelques mots seulement" },
};

/** Durées proposées en un tap, en minutes. */
export const DURATION_CHOICES = [45, 60, 90, 120] as const;
export const MIN_DURATION = 5;
export const MAX_DURATION = 600;
export const LABEL_MAX = 40;

/** Nom affiché : le sport, ou le nom libre pour « autre ». */
export function activityName(sport: Sport, label: string | null): string {
  return sport === "autre" && label ? label : SPORT_LABELS[sport];
}

/** « 1 h 30 », « 45 min », « 2 h ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

const kcalFormat = new Intl.NumberFormat("fr-FR");

/** Ordre de grandeur, jamais un chiffre au kcal près. */
export function formatKcal(kcal: number): string {
  return `environ ${kcalFormat.format(kcal)} kcal`;
}
