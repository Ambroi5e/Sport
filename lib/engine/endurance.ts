/** Endurance : allure selon le sport, kilomètres par semaine, records. */

export const ENDURANCE_SPORTS = ["course", "trail", "velo", "natation", "rameur", "marche"] as const;
export type EnduranceSport = (typeof ENDURANCE_SPORTS)[number];

export function isEndurance(sport: string): sport is EnduranceSport {
  return (ENDURANCE_SPORTS as readonly string[]).includes(sport);
}

/** Unité d'allure habituelle : secondes par distance de référence, ou vitesse pour le vélo. */
export type PaceUnit = "min_km" | "kmh" | "min_100m" | "min_500m";

export const PACE_UNITS: Readonly<Record<EnduranceSport, PaceUnit>> = {
  course: "min_km",
  trail: "min_km",
  marche: "min_km",
  velo: "kmh",
  natation: "min_100m",
  rameur: "min_500m",
};

const PACE_METERS: Readonly<Record<Exclude<PaceUnit, "kmh">, number>> = { min_km: 1000, min_100m: 100, min_500m: 500 };

export type Pace = { unit: PaceUnit; /** Secondes par distance de référence, ou km/h (à 0,1 près) pour le vélo. */ value: number };

/** Allure d'une sortie ; `null` sans distance ou sans durée. */
export function paceOf(sport: EnduranceSport, distanceM: number | null, seconds: number): Pace | null {
  if (!distanceM || distanceM <= 0 || seconds <= 0) return null;
  const unit = PACE_UNITS[sport];
  if (unit === "kmh") return { unit, value: Math.round((distanceM / 1000 / (seconds / 3600)) * 10) / 10 };
  return { unit, value: Math.round((seconds * PACE_METERS[unit]) / distanceM) };
}

/** Une allure est meilleure quand elle est plus rapide : moins de secondes, ou plus de km/h. */
export function isFaster(a: Pace, b: Pace): boolean {
  return a.unit === "kmh" ? a.value > b.value : a.value < b.value;
}

export type Outing = { id: string; date: string; sport: string; distanceM: number | null; seconds: number; elevationM?: number | null; avgHr?: number | null };

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shift(date, -((day + 6) % 7));
}

export type WeekDistance = { weekStart: string; meters: number; seconds: number; outings: number };

/**
 * Distance, durée et nombre de sorties de chaque semaine (lundi à dimanche) pour un
 * sport, de la plus ancienne à la semaine de `today`. Une semaine sans sortie reste à zéro.
 */
export function weeklyDistance(outings: readonly Outing[], sport: EnduranceSport, today: string, weeks = 8): WeekDistance[] {
  const current = mondayOf(today);
  const list: WeekDistance[] = Array.from({ length: weeks }, (_, i) => ({ weekStart: shift(current, (i - weeks + 1) * 7), meters: 0, seconds: 0, outings: 0 }));
  const byWeek = new Map(list.map((w) => [w.weekStart, w]));
  for (const o of outings) {
    if (o.sport !== sport || o.date > today) continue;
    const week = byWeek.get(mondayOf(o.date));
    if (!week) continue;
    week.meters += o.distanceM ?? 0;
    week.seconds += o.seconds;
    week.outings += 1;
  }
  return list;
}

/** Seuils des records d'allure, en mètres : « sur les sorties d'au moins… ». */
export const RECORD_DISTANCES: Readonly<Record<EnduranceSport, readonly number[]>> = {
  course: [5000, 10_000, 21_097, 42_195],
  trail: [10_000, 20_000, 40_000],
  marche: [5000, 10_000, 20_000],
  velo: [20_000, 50_000, 100_000],
  natation: [1000, 1500, 3000],
  rameur: [2000, 5000, 10_000],
};

export type EnduranceRecords = {
  /** La plus longue sortie mesurée. */
  longest: Outing | null;
  /** Le plus de dénivelé en une sortie. */
  climb: Outing | null;
  /** Meilleure allure parmi les sorties d'au moins `meters` ; seulement les seuils atteints. */
  paces: { meters: number; outing: Outing; pace: Pace }[];
};

/**
 * Records d'un sport. Une allure record est celle d'une sortie entière d'au moins la
 * distance du seuil : pas un temps sur la distance exacte, qu'on ne connaît pas sans
 * le détail kilomètre par kilomètre. À égalité, la sortie la plus ancienne garde le record.
 */
export function enduranceRecords(outings: readonly Outing[], sport: EnduranceSport): EnduranceRecords {
  const measured = outings.filter((o) => o.sport === sport && o.distanceM !== null && o.distanceM > 0).sort((a, b) => a.date.localeCompare(b.date));
  let longest: Outing | null = null;
  let climb: Outing | null = null;
  for (const o of measured) {
    if (!longest || o.distanceM! > longest.distanceM!) longest = o;
    if (o.elevationM && (!climb || o.elevationM > climb.elevationM!)) climb = o;
  }
  const paces: EnduranceRecords["paces"] = [];
  for (const meters of RECORD_DISTANCES[sport]) {
    let best: { outing: Outing; pace: Pace } | null = null;
    for (const o of measured) {
      if (o.distanceM! < meters) continue;
      const pace = paceOf(sport, o.distanceM, o.seconds);
      if (pace && (!best || isFaster(pace, best.pace))) best = { outing: o, pace };
    }
    if (best) paces.push({ meters, ...best });
  }
  return { longest, climb, paces };
}
