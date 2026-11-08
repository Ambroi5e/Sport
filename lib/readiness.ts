import type { CheckinField, ReadinessLevel } from "@/lib/engine";

/** Les quatre échelles du check-in, avec les mots aux deux bouts. */
export const CHECKIN_SCALES: Record<CheckinField, { label: string; low: string; high: string }> = {
  sleep: { label: "Sommeil", low: "Très mauvais", high: "Excellent" },
  soreness: { label: "Courbatures", low: "Aucune", high: "Fortes" },
  energy: { label: "Énergie", low: "À plat", high: "Au top" },
  stress: { label: "Stress", low: "Serein", high: "Très stressé" },
};

/** Sens de chaque note : sommeil et énergie mieux en haut, courbatures et stress mieux en bas. */
export const HIGHER_IS_BETTER: Record<CheckinField, boolean> = { sleep: true, soreness: false, energy: true, stress: false };

export const LEVEL_LABELS: Record<ReadinessLevel, string> = { bonne: "Bonne forme", moyenne: "Forme moyenne", basse: "Forme basse" };

/** Conseil du jour, général et prudent. Les actions (alléger, décaler) arrivent avec le planning. */
export const LEVEL_ADVICE: Record<ReadinessLevel, string> = {
  bonne: "Feu vert : ta séance prévue, normalement.",
  moyenne: "Séance possible : échauffe-toi bien et ajuste la charge à tes sensations.",
  basse: "Lève le pied aujourd'hui : séance plus légère (moins de séries, charge un peu plus basse) ou repos.",
};

/** Ce qui tire la forme vers le bas, dit simplement. */
export const FACTOR_LABELS: Record<CheckinField, string> = {
  sleep: "nuit difficile",
  soreness: "courbatures marquées",
  energy: "énergie basse",
  stress: "stress élevé",
};

export const HEALTH_REMINDER = "Fatigue qui dure, douleur ou maladie : parles-en à un professionnel de santé.";

const score = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « 3,8 » */
export function formatScore(value: number): string {
  return score.format(value);
}

export const READINESS_PERIODS = {
  "1m": { days: 30, label: "1 mois" },
  "3m": { days: 91, label: "3 mois" },
  "6m": { days: 182, label: "6 mois" },
} as const;
export type ReadinessPeriod = keyof typeof READINESS_PERIODS;

export function isReadinessPeriod(value: unknown): value is ReadinessPeriod {
  return typeof value === "string" && Object.hasOwn(READINESS_PERIODS, value);
}
