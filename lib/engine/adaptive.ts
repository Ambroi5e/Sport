/**
 * Dépense réelle (TDEE adaptatif) : ce qu'on mange en moyenne, moins ce que le
 * poids gagne ou perd, converti en énergie. Un calcul explicable, à la lecture,
 * sur les dernières semaines complètes.
 */

import type { WeighIn } from "./weight";

/** Énergie d'un kilo de poids corporel, valeur de référence courante. */
export const KCAL_PER_KG = 7700;
export const ADAPTIVE_DAYS = 28;
/** Jours notés qui comptent, au minimum, sur la période. */
export const MIN_COUNTED_DAYS = 14;
export const MIN_WEIGH_INS = 4;
/** Écart minimal, en jours, entre la première et la dernière pesée. */
export const MIN_WEIGHT_SPAN = 14;
/** Un jour noté à moins de 60 % du jour habituel est sans doute un oubli. */
export const LOGGED_SHARE = 0.6;
const BOUNDS = { min: 1200, max: 6000 };

const DAY_MS = 86_400_000;
const dayIndex = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const shift = (date: string, days: number) => new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);

export type AdaptiveTdee =
  | {
      ok: true;
      /** Dépense estimée, en kcal par jour. */
      kcal: number;
      /** Apports moyens des jours qui comptent. */
      intake: number;
      /** Variation du poids, en kg par semaine (pente des pesées). */
      weeklyChangeKg: number;
      countedDays: number;
      loggedDays: number;
      weighIns: number;
      weightSpanDays: number;
      from: string;
      to: string;
    }
  | {
      ok: false;
      /** Le premier manque rencontré ; les compteurs disent où en est chaque condition. */
      reason: "jours" | "pesees" | "incoherent";
      countedDays: number;
      loggedDays: number;
      weighIns: number;
      weightSpanDays: number;
      from: string;
      to: string;
    };

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Pente des moindres carrés, en kg par jour. */
function slope(points: WeighIn[]): number {
  const xs = points.map((p) => dayIndex(p.date));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = points.reduce((a, p) => a + p.kg, 0) / points.length;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (xs[i] - mx) * (p.kg - my);
    den += (xs[i] - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/**
 * Sur les `days` jours qui précèdent `asOf` (aujourd'hui, pas encore fini, est
 * exclu) : apports moyens des jours qui comptent, pente des pesées jusqu'à
 * aujourd'hui inclus (la pesée du matin reflète la veille). Il faut 14 jours qui
 * comptent et 4 pesées étalées sur 14 jours au moins.
 */
export function adaptiveTdee(p: { intake: readonly { date: string; kcal: number }[]; weights: readonly WeighIn[]; asOf: string; days?: number }): AdaptiveTdee {
  const days = p.days ?? ADAPTIVE_DAYS;
  const to = shift(p.asOf, -1);
  const from = shift(to, -(days - 1));
  const logged = p.intake.filter((d) => d.date >= from && d.date <= to && d.kcal > 0);
  const usual = logged.length ? median(logged.map((d) => d.kcal)) : 0;
  const counted = logged.filter((d) => d.kcal >= usual * LOGGED_SHARE);
  const weights = p.weights.filter((w) => w.date >= from && w.date <= p.asOf);
  const spread = weights.length ? Math.max(...weights.map((w) => dayIndex(w.date))) - Math.min(...weights.map((w) => dayIndex(w.date))) : 0;
  const base = { countedDays: counted.length, loggedDays: logged.length, weighIns: weights.length, weightSpanDays: spread, from, to };

  if (counted.length < MIN_COUNTED_DAYS) return { ok: false, reason: "jours", ...base };
  if (weights.length < MIN_WEIGH_INS || spread < MIN_WEIGHT_SPAN) return { ok: false, reason: "pesees", ...base };

  const intake = counted.reduce((sum, d) => sum + d.kcal, 0) / counted.length;
  const perDay = slope(weights);
  const kcal = intake - perDay * KCAL_PER_KG;
  if (kcal < BOUNDS.min || kcal > BOUNDS.max) return { ok: false, reason: "incoherent", ...base };
  return { ok: true, kcal: Math.round(kcal / 10) * 10, intake: Math.round(intake), weeklyChangeKg: Math.round(perDay * 7 * 100) / 100, ...base };
}
