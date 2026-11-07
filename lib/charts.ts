/** Échelles des courbes : graduations rondes et dates des axes. */

/**
 * Graduations rondes (pas de 1, 2, 2,5 ou 5 × 10^n) qui encadrent [min, max],
 * environ `target` intervalles. Une plage nulle est élargie autour de la valeur.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    const pad = Math.abs(lo) * 0.02 || 1;
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw - 1e-12)!;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + (step / magnitude === 2.5 ? 1 : 0));
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(hi / step - 1e-9);
  return Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toFixed(decimals)));
}

const DAY_MS = 86_400_000;

/** Position d'une date entre `from` et `to`, en pourcentage. */
export function datePercent(date: string, from: string, to: string): number {
  const span = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  if (span <= 0) return 50;
  return ((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / span) * 100;
}

/** `count` dates régulièrement espacées de `from` à `to`, extrémités comprises. */
export function dateTicks(from: string, to: string, count = 4): string[] {
  const start = Date.parse(`${from}T00:00:00Z`) / DAY_MS;
  const end = Date.parse(`${to}T00:00:00Z`) / DAY_MS;
  if (end <= start) return [from];
  const n = Math.max(2, Math.min(count, end - start + 1));
  return Array.from({ length: n }, (_, i) => new Date(Math.round(start + ((end - start) * i) / (n - 1)) * DAY_MS).toISOString().slice(0, 10));
}

const axisDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** « 3 nov. » */
export function formatAxisDate(date: string): string {
  return axisDate.format(new Date(`${date}T00:00:00Z`));
}
