/** Corps et progrès : courbe du poids, alerte de rythme, mensurations, force au fil des semaines. */

import { isoWeekday } from "./nutrition";
import { setE1RM, setVolume, type SetEntry } from "./training";
import { movingAverage, type WeighIn } from "./weight";

const DAY_MS = 86_400_000;

function dayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function shift(date: string, days: number): string {
  return new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

function monday(date: string): string {
  return shift(date, 1 - isoWeekday(date));
}

export type ChartPoint = { date: string; value: number };

/**
 * Courbe du poids entre `from` et `to` (inclus) : les pesées, et la moyenne
 * mobile sur `days` jours calculée chaque jour, de la première à la dernière pesée.
 */
export function weightSeries(entries: WeighIn[], from: string, to: string, days = 7): { weighIns: ChartPoint[]; average: ChartPoint[] } {
  const start = dayIndex(from);
  const end = dayIndex(to);
  const weighIns = entries
    .filter((e) => dayIndex(e.date) >= start && dayIndex(e.date) <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, value: e.kg }));
  if (weighIns.length === 0) return { weighIns, average: [] };

  const average: ChartPoint[] = [];
  const last = weighIns[weighIns.length - 1].date;
  for (let d = weighIns[0].date; d <= last; d = shift(d, 1)) {
    const value = movingAverage(entries, d, days);
    if (value !== null) average.push({ date: d, value });
  }
  return { weighIns, average };
}

/** Il faut au moins deux pesées dans une semaine pour que sa moyenne compte. */
export const MIN_WEIGH_INS_PER_WEEK = 2;

/**
 * Moyennes de `weeks` semaines glissantes de 7 jours qui se terminent à `asOf`,
 * la plus ancienne en premier. Une semaine trop peu pesée vaut `null`.
 */
export function rollingWeekAverages(entries: WeighIn[], asOf: string, weeks = 3): (number | null)[] {
  const end = dayIndex(asOf);
  return Array.from({ length: weeks }, (_, i) => {
    const hi = end - (weeks - 1 - i) * 7;
    const window = entries.filter((e) => dayIndex(e.date) <= hi && dayIndex(e.date) > hi - 7);
    return window.length < MIN_WEIGH_INS_PER_WEEK ? null : window.reduce((sum, e) => sum + e.kg, 0) / window.length;
  });
}

/** Ajustement proposé quand le rythme sort de la cible deux semaines de suite. */
export const PACE_ADJUSTMENT_KCAL = 200;

export type PaceAlert = {
  direction: "au_dessus" | "en_dessous";
  /** Variation de la cible calorique proposée, en kcal par jour. */
  kcal: number;
  /** Les deux dernières variations hebdomadaires, en kg. */
  changes: [number, number];
};

const EPSILON = 1e-9;

/**
 * Alerte de rythme : on compare trois semaines glissantes. Si les deux dernières
 * variations sortent de la fourchette dans le même sens, on propose ±200 kcal.
 * Au-dessus de la fourchette (prise trop rapide, ou perte trop lente), on retire ;
 * en dessous, on ajoute. C'est une suggestion, jamais appliquée seule.
 */
export function paceAlert(entries: WeighIn[], asOf: string, target: { min: number; max: number }): PaceAlert | null {
  const [a, b, c] = rollingWeekAverages(entries, asOf, 3);
  if (a === null || b === null || c === null) return null;
  const changes: [number, number] = [b - a, c - b];
  if (changes.every((d) => d > target.max + EPSILON)) return { direction: "au_dessus", kcal: -PACE_ADJUSTMENT_KCAL, changes };
  if (changes.every((d) => d < target.min - EPSILON)) return { direction: "en_dessous", kcal: PACE_ADJUSTMENT_KCAL, changes };
  return null;
}

export type Measurement = { date: string; site: string; cm: number };

export type MeasurementChange = {
  site: string;
  first: { date: string; cm: number };
  previous: { date: string; cm: number } | null;
  latest: { date: string; cm: number };
  /** Écart entre la dernière mesure et la première, en cm. */
  sinceFirst: number;
  /** Écart avec la mesure précédente, ou null s'il n'y en a qu'une. */
  sincePrevious: number | null;
  count: number;
};

/** Pour chaque zone : première, avant-dernière et dernière mesure, et les écarts. */
export function measurementChanges(rows: Measurement[]): Record<string, MeasurementChange> {
  const bySite = new Map<string, Measurement[]>();
  for (const r of rows) bySite.set(r.site, [...(bySite.get(r.site) ?? []), r]);

  const out: Record<string, MeasurementChange> = {};
  for (const [site, list] of bySite) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    out[site] = {
      site,
      first: { date: first.date, cm: first.cm },
      previous: previous ? { date: previous.date, cm: previous.cm } : null,
      latest: { date: latest.date, cm: latest.cm },
      sinceFirst: latest.cm - first.cm,
      sincePrevious: previous ? latest.cm - previous.cm : null,
      count: sorted.length,
    };
  }
  return out;
}

export type WeekVolume = { weekStart: string; volume: number; sets: number; sessions: number };

/**
 * Volume (charge × répétitions, échauffements exclus) des `weeks` dernières
 * semaines du lundi au dimanche, la plus ancienne en premier. Les semaines vides valent 0.
 */
export function weeklyVolume(sets: SetEntry[], asOf: string, weeks = 8): WeekVolume[] {
  const current = monday(asOf);
  const out = Array.from({ length: weeks }, (_, i) => ({
    weekStart: shift(current, -7 * (weeks - 1 - i)),
    volume: 0,
    sets: 0,
    sessions: new Set<string>(),
  }));
  const byWeek = new Map(out.map((w) => [w.weekStart, w]));
  for (const s of sets) {
    if (s.isWarmup) continue;
    const week = byWeek.get(monday(s.date));
    if (!week) continue;
    week.volume += setVolume(s);
    week.sets += 1;
    week.sessions.add(s.workoutId);
  }
  return out.map((w) => ({ weekStart: w.weekStart, volume: w.volume, sets: w.sets, sessions: w.sessions.size }));
}

export type SessionBest = { date: string; workoutId: string; e1rm: number; weightKg: number; reps: number };

/**
 * Meilleur 1RM estimé de chaque séance, par exercice et dans l'ordre chronologique.
 * Les séances sans série utilisable (plus de 12 reps, sans charge) n'apparaissent pas.
 */
export function e1rmHistory(sets: SetEntry[]): Record<string, SessionBest[]> {
  const best = new Map<string, Map<string, SessionBest>>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const e1rm = setE1RM(s);
    if (e1rm === null) continue;
    const sessions = best.get(s.exerciseId) ?? new Map<string, SessionBest>();
    const current = sessions.get(s.workoutId);
    if (!current || e1rm > current.e1rm + EPSILON) {
      sessions.set(s.workoutId, { date: s.date, workoutId: s.workoutId, e1rm, weightKg: s.weightKg!, reps: s.reps! });
    }
    best.set(s.exerciseId, sessions);
  }
  const out: Record<string, SessionBest[]> = {};
  for (const [exerciseId, sessions] of best) {
    out[exerciseId] = [...sessions.values()].sort((a, b) => a.date.localeCompare(b.date) || a.workoutId.localeCompare(b.workoutId));
  }
  return out;
}

/** Exercices les plus suivis : le plus de séances avec un 1RM estimé, puis le plus récent. */
export function mostTrackedExercises(history: Record<string, SessionBest[]>, limit = 4): string[] {
  return Object.entries(history)
    .sort(([, a], [, b]) => b.length - a.length || b[b.length - 1].date.localeCompare(a[a.length - 1].date))
    .slice(0, limit)
    .map(([id]) => id);
}

export type WeekDay = { date: string; weekday: number; sessions: number; sports: number; planned: boolean; isToday: boolean; isPast: boolean };

/**
 * Semaine en cours, du lundi au dimanche : séances faites chaque jour, sports
 * notés et jours habituels d'entraînement. `workoutDates` contient une date par
 * séance terminée, `activityDates` une date par activité. `done` ne compte que
 * les séances : c'est lui qu'on compare aux séances prévues.
 */
export function currentWeek(
  today: string,
  workoutDates: string[],
  trainingDays: readonly number[],
  activityDates: readonly string[] = [],
): { start: string; days: WeekDay[]; done: number } {
  const start = monday(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shift(start, i);
    return {
      date,
      weekday: i + 1,
      sessions: workoutDates.filter((d) => d === date).length,
      sports: activityDates.filter((d) => d === date).length,
      planned: trainingDays.includes(i + 1),
      isToday: date === today,
      isPast: date < today,
    };
  });
  return { start, days, done: days.reduce((sum, d) => sum + d.sessions, 0) };
}
