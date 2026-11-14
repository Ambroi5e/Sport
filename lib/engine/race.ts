/**
 * Objectif de course à pied et zones cardiaques.
 *
 * Prédiction : formule de Riegel (1981), T2 = T1 × (D2 / D1)^1,06. Zones : cinq
 * tranches de 50 à 100 % de la fréquence maximale, ou de la réserve (Karvonen)
 * quand la fréquence de repos est connue. Fréquence maximale estimée : Tanaka
 * (2001), 208 − 0,7 × âge. Des repères généraux, pas un avis médical.
 */

import type { Outing } from "./endurance";

const DAY_MS = 86_400_000;
const daysFrom = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

export const RIEGEL_EXPONENT = 1.06;
/** Sorties retenues pour prédire : au moins 3 km, dans les 12 dernières semaines. */
export const PREDICTION_MIN_M = 3000;
export const PREDICTION_DAYS = 84;

/** Temps sur `toM` d'après un temps sur `fromM`, arrondi à la seconde. */
export function riegel(seconds: number, fromM: number, toM: number): number {
  return Math.round(seconds * (toM / fromM) ** RIEGEL_EXPONENT);
}

export type RacePrediction = { seconds: number; outing: Outing };

/**
 * Temps prévu sur `distanceM` : la plus rapide des prédictions tirées des sorties
 * de course récentes. `null` sans sortie mesurée d'au moins 3 km sur la période.
 */
export function predictRace(outings: readonly Outing[], distanceM: number, today: string): RacePrediction | null {
  let best: RacePrediction | null = null;
  for (const o of outings) {
    if (o.sport !== "course" || !o.distanceM || o.distanceM < PREDICTION_MIN_M || o.seconds <= 0) continue;
    const age = daysFrom(o.date, today);
    if (age < 0 || age > PREDICTION_DAYS) continue;
    const seconds = riegel(o.seconds, o.distanceM, distanceM);
    if (!best || seconds < best.seconds) best = { seconds, outing: o };
  }
  return best;
}

/** Repères de passage, en mètres : ceux qui tombent avant l'arrivée sont montrés. */
const PASSAGE_MARKS = [5000, 10_000, 15_000, 20_000, 21_097, 30_000, 40_000, 50_000, 100_000];

/** Temps de passage à allure régulière, arrivée comprise. */
export function racePassages(targetSeconds: number, distanceM: number): { meters: number; seconds: number }[] {
  return [...PASSAGE_MARKS.filter((m) => m < distanceM), distanceM].map((meters) => ({ meters, seconds: Math.round((targetSeconds * meters) / distanceM) }));
}

/** Jours jusqu'à la course : 0 le jour même, négatif une fois passée. */
export function daysUntil(today: string, raceOn: string): number {
  return daysFrom(today, raceOn);
}

/** Fréquence maximale estimée par l'âge (Tanaka) ; l'écart individuel dépasse souvent 10 battements. */
export function estimatedHrMax(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export const HR_ZONE_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;
export const HR_ZONE_COUNT = HR_ZONE_BOUNDS.length - 1;

export type HrZone = { zone: number; from: number; to: number };

/**
 * Cinq zones en battements par minute. Avec `hrRest`, les pourcentages portent sur
 * la réserve (max − repos) ; sinon sur la fréquence maximale. Chaque zone commence
 * un battement après la fin de la précédente.
 */
export function hrZones(hrMax: number, hrRest?: number | null): HrZone[] {
  const at = (p: number) => Math.round(hrRest ? hrRest + p * (hrMax - hrRest) : p * hrMax);
  return Array.from({ length: HR_ZONE_COUNT }, (_, i) => ({ zone: i + 1, from: i === 0 ? at(HR_ZONE_BOUNDS[0]) : at(HR_ZONE_BOUNDS[i]) + 1, to: at(HR_ZONE_BOUNDS[i + 1]) }));
}

/** Zone d'une fréquence : 0 sous la zone 1, 5 au-delà de la fréquence maximale notée. */
export function hrZoneOf(hr: number, zones: readonly HrZone[]): number {
  if (hr < zones[0].from) return 0;
  return zones.find((z) => hr <= z.to)?.zone ?? zones[zones.length - 1].zone;
}

/**
 * Secondes passées dans chaque zone (index 0 : sous la zone 1) depuis `since`, d'après
 * la fréquence moyenne de chaque sortie : une sortie entière compte dans une seule zone.
 */
export function hrZoneTime(outings: readonly (Outing & { avgHr?: number | null })[], zones: readonly HrZone[], since: string): number[] {
  const time = Array.from({ length: zones.length + 1 }, () => 0);
  for (const o of outings) {
    if (!o.avgHr || o.date < since) continue;
    time[hrZoneOf(o.avgHr, zones)] += o.seconds;
  }
  return time;
}
