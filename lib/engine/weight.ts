/** Tendance du poids : moyenne mobile et rythme hebdomadaire. */

export type WeighIn = {
  /** Date locale de la pesée, au format AAAA-MM-JJ. */
  date: string;
  kg: number;
};

const DAY_MS = 86_400_000;

function dayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/**
 * Moyenne des pesées des `days` derniers jours (inclus) jusqu'à `asOf`.
 * Renvoie `null` s'il n'y a aucune pesée dans la fenêtre.
 */
export function movingAverage(entries: WeighIn[], asOf: string, days = 7): number | null {
  const end = dayIndex(asOf);
  const window = entries.filter((e) => {
    const d = dayIndex(e.date);
    return d <= end && d > end - days;
  });
  if (window.length === 0) return null;
  return window.reduce((sum, e) => sum + e.kg, 0) / window.length;
}

/**
 * Rythme en kg par semaine : pente de la droite des moindres carrés sur les
 * `days` derniers jours. Il faut au moins 4 pesées étalées sur 7 jours ou plus,
 * sinon la tendance n'est pas fiable et on renvoie `null`.
 */
export function weeklyRate(entries: WeighIn[], asOf: string, days = 14): number | null {
  const end = dayIndex(asOf);
  const points = entries
    .map((e) => ({ x: dayIndex(e.date), y: e.kg }))
    .filter((p) => p.x <= end && p.x > end - days);
  if (points.length < 4) return null;
  const xs = points.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;

  const n = points.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  return (num / den) * 7;
}

export type RateStatus = "dans_la_cible" | "trop_lent" | "trop_rapide" | "inconnu";

/** Compare un rythme à une fourchette cible (ex. prise de masse : 0,25 à 0,5 kg/semaine). */
export function rateStatus(rate: number | null, target: { min: number; max: number }): RateStatus {
  if (rate === null) return "inconnu";
  if (rate < target.min) return "trop_lent";
  if (rate > target.max) return "trop_rapide";
  return "dans_la_cible";
}
