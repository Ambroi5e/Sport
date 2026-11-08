/**
 * Forme du jour : quatre notes de 1 à 5, une note de forme sur 5 et un niveau.
 * Les notes gardent leur sens naturel : sommeil et énergie (5 = très bien),
 * courbatures et stress (5 = forts). La note de forme les remet dans le même sens.
 */

import { weightSeries, type ChartPoint } from "./body";

export type Checkin = { sleep: number; soreness: number; energy: number; stress: number };
export type DatedCheckin = Checkin & { date: string };

export const CHECKIN_FIELDS = ["sleep", "soreness", "energy", "stress"] as const;
export type CheckinField = (typeof CHECKIN_FIELDS)[number];

export type ReadinessLevel = "bonne" | "moyenne" | "basse";

/** En dessous : forme basse. */
export const LOW_READINESS = 2.5;
/** À partir de : bonne forme, si aucune note n'est à son pire. */
export const GOOD_READINESS = 3.5;

/** Note de forme sur 5, à 0,1 près : moyenne du sommeil, de l'énergie, de 6 − courbatures et de 6 − stress. */
export function readinessScore(c: Checkin): number {
  return Math.round(((c.sleep + c.energy + (6 - c.soreness) + (6 - c.stress)) / 4) * 10) / 10;
}

/**
 * Niveau de forme. Basse sous 2,5, ou avec un sommeil à 1 ou des courbatures à 5 ;
 * bonne à 3,5 et plus sans aucune note à son pire ; moyenne sinon. `factors` liste
 * ce qui tire la forme vers le bas (sommeil ou énergie à 2 ou moins, courbatures ou
 * stress à 4 ou plus), pour l'expliquer.
 */
export function readiness(c: Checkin): { score: number; level: ReadinessLevel; factors: CheckinField[] } {
  const score = readinessScore(c);
  const factors = CHECKIN_FIELDS.filter((f) => (f === "sleep" || f === "energy" ? c[f] <= 2 : c[f] >= 4));
  const worst = c.sleep === 1 || c.energy === 1 || c.soreness === 5 || c.stress === 5;
  const level: ReadinessLevel =
    score < LOW_READINESS || c.sleep === 1 || c.soreness === 5 ? "basse" : score >= GOOD_READINESS && !worst ? "bonne" : "moyenne";
  return { score, level, factors };
}

/** Courbe de forme entre `from` et `to` : la note de chaque jour et sa moyenne sur `days` jours. */
export function readinessSeries(checkins: readonly DatedCheckin[], from: string, to: string, days = 7): { points: ChartPoint[]; average: ChartPoint[] } {
  const { weighIns, average } = weightSeries(
    checkins.map((c) => ({ date: c.date, kg: readinessScore(c) })),
    from,
    to,
    days,
  );
  return { points: weighIns, average };
}

/**
 * Moyenne de chaque note sur les `days` jours qui finissent à `asOf`, et sur les
 * `days` jours d'avant, pour dire ce qui bouge. `null` sans check-in dans la fenêtre.
 */
export function checkinAverages(
  checkins: readonly DatedCheckin[],
  asOf: string,
  days = 7,
): { current: Record<CheckinField, number | null>; previous: Record<CheckinField, number | null>; count: number } {
  const end = Date.parse(`${asOf}T00:00:00Z`);
  const age = (date: string) => Math.round((end - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  const window = (lo: number) => checkins.filter((c) => age(c.date) >= lo && age(c.date) < lo + days);
  const mean = (list: readonly DatedCheckin[]) =>
    Object.fromEntries(CHECKIN_FIELDS.map((f) => [f, list.length ? Math.round((list.reduce((s, c) => s + c[f], 0) / list.length) * 10) / 10 : null])) as Record<
      CheckinField,
      number | null
    >;
  const current = window(0);
  return { current: mean(current), previous: mean(window(days)), count: current.length };
}
