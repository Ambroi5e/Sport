/** Date locale AAAA-MM-JJ dans le fuseau de l'utilisateur. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Décale une date AAAA-MM-JJ de `days` jours. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const shortFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function formatShortDate(date: string): string {
  return shortFormatter.format(new Date(`${date}T00:00:00Z`));
}

/** Lundi de la semaine d'une date AAAA-MM-JJ. */
export function weekStart(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  return addDays(date, day === 0 ? -6 : 1 - day);
}

const longFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function formatLongDate(date: string): string {
  return longFormatter.format(new Date(`${date}T00:00:00Z`));
}
