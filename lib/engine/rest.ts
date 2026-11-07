/** Chrono de repos entre deux séries. */

export const REST_DEFAULT_SECONDS = 90;
export const REST_MIN_SECONDS = 15;
export const REST_MAX_SECONDS = 600;
export const REST_STEP_SECONDS = 15;
/** Choix proposés dans Réglages. */
export const REST_PRESETS = [60, 90, 120, 180] as const;

/** Durée de repos ramenée entre 15 s et 10 min, en secondes entières. */
export function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) return REST_DEFAULT_SECONDS;
  return Math.min(REST_MAX_SECONDS, Math.max(REST_MIN_SECONDS, Math.round(seconds)));
}

/**
 * Secondes restantes avant la fin du repos, arrondies au-dessus pour que
 * « 0:00 » corresponde à la fin réelle. Négatif une fois le repos dépassé.
 */
export function restRemaining(endsAt: number, now: number): number {
  const ms = endsAt - now;
  if (ms > 0) return Math.ceil(ms / 1000);
  const over = Math.floor(-ms / 1000);
  return over === 0 ? 0 : -over;
}

/** « 1:30 », « 0:05 » ; un dépassement s'écrit « +0:12 ». */
export function formatClock(seconds: number): string {
  const abs = Math.abs(Math.trunc(seconds));
  const text = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return seconds < 0 ? `+${text}` : text;
}
