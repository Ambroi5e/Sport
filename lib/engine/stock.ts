/** Stock de la maison : péremption, tri, et ce qu'il reste à racheter une fois le stock déduit. */

/** À partir de ce nombre de jours avant la date, un article est « à finir ». */
export const EXPIRY_SOON_DAYS = 3;

export type ExpiryState = "perime" | "bientot" | "ok" | "sans-date";
export type Expiry = { state: ExpiryState; /** Jours avant la date ; négatif une fois dépassée ; null sans date. */ days: number | null };

/** Où en est un article : périmé, à finir, tranquille, ou sans date. Le jour de la date compte encore. */
export function expiryOf(expiresOn: string | null, today: string): Expiry {
  if (!expiresOn) return { state: "sans-date", days: null };
  const days = Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return { state: days < 0 ? "perime" : days <= EXPIRY_SOON_DAYS ? "bientot" : "ok", days };
}

/** Le plus urgent en haut : par date de péremption, puis les articles sans date, par nom. */
export function sortStock<T extends { name: string; expiresOn: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.expiresOn !== b.expiresOn) {
      if (a.expiresOn === null) return 1;
      if (b.expiresOn === null) return -1;
      return a.expiresOn < b.expiresOn ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "fr");
  });
}

/**
 * Grammes en stock par aliment : seuls comptent les articles reliés à un aliment,
 * dont on connaît le poids et qui ne sont pas périmés.
 */
export function stockByFood(
  items: readonly { foodId: string | null; grams: number | null; expiresOn: string | null }[],
  today: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.foodId || item.grams === null || expiryOf(item.expiresOn, today).state === "perime") continue;
    totals.set(item.foodId, (totals.get(item.foodId) ?? 0) + item.grams);
  }
  return totals;
}

/** Ce qu'il manque d'un aliment une fois le stock déduit ; jamais négatif. */
export function missingGrams(needed: number, inStock: number): number {
  return Math.max(0, needed - Math.max(0, inStock));
}
