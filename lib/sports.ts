import { isEndurance, type Intensity, type Pace } from "@/lib/engine";
import type { Enums } from "@/lib/supabase/database.types";

export type Sport = Enums<"activity_sport">;

export const SPORT_LABELS: Record<Sport, string> = {
  course: "Course à pied",
  trail: "Trail",
  velo: "Vélo",
  natation: "Natation",
  rameur: "Rameur",
  marche: "Marche",
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

// Endurance ------------------------------------------------------------------------

export const MIN_DISTANCE_M = 50;
export const MAX_DISTANCE_M = 1_000_000;
export const MAX_ELEVATION_M = 20_000;
export const MIN_HR = 30;
export const MAX_HR = 240;

/** La natation et le rameur se comptent en mètres, le reste en kilomètres. */
export function distanceUnit(sport: string): "km" | "m" {
  return sport === "natation" || sport === "rameur" ? "m" : "km";
}

/** Le dénivelé n'a de sens que dehors, à pied ou à vélo. */
export function hasElevation(sport: string): boolean {
  return isEndurance(sport) && distanceUnit(sport) === "km";
}

const kmFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const meterFormat = new Intl.NumberFormat("fr-FR");
const speedFormat = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « 10,2 km », « 1 500 m » en natation et au rameur. */
export function formatDistance(meters: number, sport: string): string {
  return distanceUnit(sport) === "m" ? `${meterFormat.format(meters)} m` : `${kmFormat.format(Math.round(meters / 10) / 100)} km`;
}

/** Kilomètres d'un total, à 0,1 près : « 32,5 km ». */
export function formatKm(meters: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** Distance telle qu'on la saisit : « 10,2 » (km) ou « 1500 » (m). */
export function distanceInput(meters: number | null, sport: string): string {
  if (meters === null) return "";
  return distanceUnit(sport) === "m" ? String(meters) : String(Math.round(meters / 10) / 100).replace(".", ",");
}

/** Mètres depuis la saisie (« 10,2 » km, « 1500 » m) ; `null` si ce n'est pas un nombre. */
export function parseDistance(value: string, sport: string): number | null {
  const n = Number(value.trim().replace(",", "."));
  if (!value.trim() || !Number.isFinite(n)) return null;
  return Math.round(distanceUnit(sport) === "m" ? n : n * 1000);
}

/** « 47:30 », « 1:02:05 ». */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const PACE_SUFFIX = { min_km: "/km", min_100m: "/100 m", min_500m: "/500 m" } as const;

/** « 4:45 /km », « 30,0 km/h », « 2:00 /100 m », « 1:55 /500 m ». */
export function formatPace(pace: Pace): string {
  return pace.unit === "kmh" ? `${speedFormat.format(pace.value)} km/h` : `${formatDuration(pace.value)} ${PACE_SUFFIX[pace.unit]}`;
}

/** Nom d'un seuil de record : « 5 km », « semi », « marathon », « 1 500 m ». */
export function recordLabel(meters: number, sport: string): string {
  if (meters === 21_097) return "semi-marathon";
  if (meters === 42_195) return "marathon";
  return formatDistance(meters, sport);
}
