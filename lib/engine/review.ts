/** Bilan de la semaine : ce qui s'est passé du lundi au dimanche, rubrique par rubrique. */

import { rollingWeekAverages } from "./body";
import { dayTypeFor, type DayType } from "./nutrition";
import { GOOD_READINESS, LOW_READINESS, readinessScore, type DatedCheckin, type ReadinessLevel } from "./readiness";
import { rateStatus, type RateStatus, type WeighIn } from "./weight";

/** Il faut ce nombre de jours notés pour que la moyenne de la semaine ait un sens. */
export const MIN_REVIEW_FOOD_DAYS = 4;
/** À moins de 5 % de la cible de calories, on est « dans la cible ». */
export const KCAL_TOLERANCE = 0.05;
/** À 90 % de la cible de protéines et plus, elle est tenue. */
export const PROTEIN_SHARE = 0.9;

export type ReviewInput = {
  /** Lundi de la semaine. */
  weekStart: string;
  sessionsPlanned: number | null;
  /** Une date par séance terminée. */
  workoutDates: readonly string[];
  /** Sports notés. */
  activities: readonly { date: string; minutes: number }[];
  /** Séries de travail de la semaine et de la précédente. */
  sets: number;
  previousSets: number;
  intake: readonly { date: string; kcal: number; proteinG: number }[];
  targets: Partial<Record<DayType, { kcal: number; proteinG: number }>>;
  trainingDays: readonly number[];
  weights: readonly WeighIn[];
  /** Rythme de poids visé, en kg par semaine, quand l'objectif en a un. */
  rateTarget: { min: number; max: number } | null;
  checkins: readonly DatedCheckin[];
  purchases: readonly { on: string; amount: number }[];
  budget: number | null;
};

export type WeekReview = {
  weekStart: string;
  weekEnd: string;
  training: {
    sessions: number;
    planned: number | null;
    /** `null` sans nombre de séances prévu. */
    status: "atteint" | "partiel" | "rien" | null;
    sets: number;
    previousSets: number;
    sports: number;
    sportsMinutes: number;
  };
  nutrition: {
    daysLogged: number;
    /** Moyennes sur les jours notés ; null quand trop peu de jours le sont. */
    kcal: number | null;
    proteinG: number | null;
    /** Cibles moyennes des mêmes jours ; null sans cibles. */
    targetKcal: number | null;
    targetProteinG: number | null;
    kcalStatus: "dans_la_cible" | "au_dessus" | "en_dessous" | null;
    proteinReached: boolean | null;
  };
  weight: {
    /** Moyenne des pesées de la semaine (deux au moins). */
    average: number | null;
    /** Écart avec la moyenne de la semaine précédente. */
    change: number | null;
    status: RateStatus | null;
  };
  readiness: { days: number; score: number | null; level: ReadinessLevel | null };
  budget: { spent: number; budget: number | null; remaining: number | null };
};

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Le bilan d'une semaine. Une rubrique sans données reste à `null` : on ne conclut rien d'un vide. */
export function weekReview(p: ReviewInput): WeekReview {
  const weekEnd = shift(p.weekStart, 6);
  const inWeek = (date: string) => date >= p.weekStart && date <= weekEnd;

  const workoutDays = p.workoutDates.filter(inWeek);
  const sports = p.activities.filter((a) => inWeek(a.date));
  const sessions = workoutDays.length;
  const status = p.sessionsPlanned ? (sessions >= p.sessionsPlanned ? "atteint" : sessions > 0 ? "partiel" : "rien") : null;

  const days = p.intake.filter((d) => inWeek(d.date) && d.kcal > 0);
  const enough = days.length >= MIN_REVIEW_FOOD_DAYS;
  const active = new Set([...workoutDays, ...sports.map((s) => s.date)]);
  const dayTargets = days.map((d) => p.targets[dayTypeFor(d.date, p.trainingDays, active.has(d.date))]);
  const hasTargets = enough && dayTargets.every((t) => t !== undefined);
  const kcal = enough ? mean(days.map((d) => d.kcal)) : null;
  const proteinG = enough ? mean(days.map((d) => d.proteinG)) : null;
  const targetKcal = hasTargets ? mean(dayTargets.map((t) => t!.kcal)) : null;
  const targetProteinG = hasTargets ? mean(dayTargets.map((t) => t!.proteinG)) : null;
  const kcalStatus =
    kcal === null || targetKcal === null
      ? null
      : kcal > targetKcal * (1 + KCAL_TOLERANCE)
        ? "au_dessus"
        : kcal < targetKcal * (1 - KCAL_TOLERANCE)
          ? "en_dessous"
          : "dans_la_cible";

  const [previous, average] = rollingWeekAverages([...p.weights], weekEnd, 2);
  const change = previous !== null && average !== null ? average - previous : null;

  const checkins = p.checkins.filter((c) => inWeek(c.date));
  const score = checkins.length ? Math.round(mean(checkins.map(readinessScore)) * 10) / 10 : null;

  const spent = Math.round(p.purchases.filter((x) => inWeek(x.on)).reduce((sum, x) => sum + x.amount, 0) * 100) / 100;

  return {
    weekStart: p.weekStart,
    weekEnd,
    training: {
      sessions,
      planned: p.sessionsPlanned,
      status,
      sets: p.sets,
      previousSets: p.previousSets,
      sports: sports.length,
      sportsMinutes: sports.reduce((sum, s) => sum + s.minutes, 0),
    },
    nutrition: {
      daysLogged: days.length,
      kcal,
      proteinG,
      targetKcal,
      targetProteinG,
      kcalStatus,
      proteinReached: proteinG === null || targetProteinG === null ? null : proteinG >= targetProteinG * PROTEIN_SHARE,
    },
    weight: { average, change, status: p.rateTarget && change !== null ? rateStatus(change, p.rateTarget) : null },
    readiness: { days: checkins.length, score, level: score === null ? null : score < LOW_READINESS ? "basse" : score >= GOOD_READINESS ? "bonne" : "moyenne" },
    budget: { spent, budget: p.budget, remaining: p.budget === null ? null : Math.round((p.budget - spent) * 100) / 100 },
  };
}

/** La semaine que le bilan montre d'office : celle en cours le dimanche, sinon la précédente. */
export function reviewWeek(today: string): string {
  const day = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  return day === 0 ? shift(today, -6) : shift(today, -6 - day);
}
