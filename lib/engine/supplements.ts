/** Compléments : régularité des prises sur les derniers jours. */

export const SUPPLEMENT_MOMENTS = ["matin", "midi", "avant_seance", "apres_seance", "soir", "coucher"] as const;
export type SupplementMoment = (typeof SUPPLEMENT_MOMENTS)[number];

/** Jours regardés pour la régularité. */
export const ADHERENCE_DAYS = 7;

export type Adherence = {
  /** Les derniers jours, du plus ancien à aujourd'hui : pris, pas pris, ou avant que le complément existe. */
  days: { date: string; taken: boolean; counted: boolean }[];
  taken: number;
  /** Jours qui comptent : depuis l'ajout du complément, `ADHERENCE_DAYS` au plus. */
  counted: number;
};

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Régularité d'un complément. Les jours d'avant son ajout ne comptent pas : un
 * complément ajouté hier n'affiche pas « 1 jour sur 7 ».
 */
export function adherence(takenOn: readonly string[], addedOn: string, today: string, span = ADHERENCE_DAYS): Adherence {
  const taken = new Set(takenOn);
  const days = Array.from({ length: span }, (_, i) => {
    const date = shift(today, i - span + 1);
    // Une prise notée pour un jour d'avant l'ajout compte quand même.
    return { date, taken: taken.has(date), counted: date >= addedOn || taken.has(date) };
  });
  return { days, taken: days.filter((d) => d.taken).length, counted: days.filter((d) => d.counted).length };
}
