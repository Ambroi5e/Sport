import { formatDistance } from "@/lib/sports";

export type RacePlan = { id: string; name: string; date: string; distanceM: number; targetSeconds: number | null };

/** Distances proposées en un tap ; « Autre » ouvre un champ en kilomètres. */
export const RACE_PRESETS = [
  { meters: 5000, label: "5 km" },
  { meters: 10_000, label: "10 km" },
  { meters: 21_097, label: "Semi-marathon" },
  { meters: 42_195, label: "Marathon" },
] as const;

export const RACE_NAME_MAX = 60;
export const MIN_RACE_M = 1000;
export const MAX_RACE_M = 250_000;
export const MIN_TARGET_S = 180;
export const MAX_TARGET_S = 216_000;
/** Une course se pose jusqu'à trois ans à l'avance, et se garde deux ans après. */
export const RACE_DAYS_AHEAD = 1095;
export const RACE_DAYS_BACK = 730;

/** « Semi-marathon (21,1 km) », « 10 km », « 15 km ». */
export function raceDistanceLabel(meters: number): string {
  const km = formatDistance(meters, "course");
  if (meters === 21_097) return `Semi-marathon (${km})`;
  if (meters === 42_195) return `Marathon (${km})`;
  return km;
}

/** « aujourd'hui », « demain », « dans 12 jours », « dans 17 semaines », « passée ». */
export function formatCountdown(days: number): string {
  if (days < 0) return "passée";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days < 21) return `dans ${days} jours`;
  return `dans ${Math.round(days / 7)} semaines`;
}

/** Noms usuels des cinq zones : des repères, pas une prescription. */
export const HR_ZONE_LABELS = ["Récupération", "Endurance facile", "Allure soutenue", "Seuil", "Intensité maximale"] as const;

export const MIN_HR_MAX = 100;
export const MAX_HR_MAX = 240;
export const MIN_HR_REST = 25;
export const MAX_HR_REST = 120;
