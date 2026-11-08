/**
 * Sports additionnels : dépense estimée par les MET.
 *
 * Valeurs du Compendium des activités physiques 2024 (Herrmann et al., pacompendium.com,
 * section Sports), une par niveau d'intensité : légère, modérée, intense. Entre
 * parenthèses, le code du Compendium ; « milieu » quand le Compendium ne donne que le
 * loisir et la compétition. Le padel n'a pas de code : il prend le tennis en double
 * et le paddleball.
 */

import type { WeighIn } from "./weight";

export const INTENSITIES = ["legere", "moderee", "intense"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const SPORT_METS: Readonly<Record<string, readonly [legere: number, moderee: number, intense: number]>> = {
  padel: [4.5, 6.0, 8.0], // tennis en double (15685), paddleball loisir (15500), tennis compétition (15676)
  tennis: [4.5, 6.8, 8.0], // double (15685), général (15675), compétition (15676)
  squash: [7.3, 9.7, 12.0], // général (15652), milieu, compétition (15650)
  badminton: [5.5, 7.0, 9.0], // loisir (15030), compétition (15020), match (15025)
  foot: [7.0, 8.3, 9.5], // loisir (15610), milieu, compétition (15605)
  basket: [6.0, 7.5, 8.0], // hors match (15050), général (15055), match (15040)
  handball: [8.0, 10.0, 12.0], // en équipe (15330), milieu, général (15320)
  rugby: [6.3, 7.3, 8.3], // touch (15562), milieu, compétition (15560)
  volley: [3.0, 4.0, 6.0], // loisir (15720), général (15710), compétition (15711)
  escalade: [5.8, 7.3, 8.8], // facile (15537), difficile (15535), bloc (15534)
  combat: [5.3, 7.8, 10.3], // technique lente (15425), sparring de boxe (15120), arts martiaux (15430)
  autre: [4.0, 6.0, 8.0], // repères : 3 à 6 MET modéré, 6 et plus vigoureux
};

/** MET d'un sport à une intensité ; un sport inconnu prend les repères de « autre ». */
export function sportMet(sport: string, intensity: Intensity): number {
  const mets = SPORT_METS[sport] ?? SPORT_METS.autre;
  return mets[INTENSITIES.indexOf(intensity)];
}

/** Dépense brute (MET × kg × heures), arrondie à 5 kcal : un ordre de grandeur. */
export function activityKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * weightKg * minutes) / 60 / 5) * 5;
}

/**
 * Poids à retenir pour une activité : la dernière pesée au plus tard ce jour-là,
 * sinon la première d'après. `null` sans aucune pesée : on ne devine pas.
 */
export function weightOn(entries: readonly WeighIn[], date: string): number | null {
  let before: WeighIn | null = null;
  let after: WeighIn | null = null;
  for (const e of entries) {
    if (e.date <= date) {
      if (!before || e.date > before.date) before = e;
    } else if (!after || e.date < after.date) after = e;
  }
  return (before ?? after)?.kg ?? null;
}

export type ActivityEntry = { date: string; sport: string; minutes: number; intensity: Intensity };

/** Dépense estimée de chaque activité, `null` quand aucune pesée ne permet de l'estimer. */
export function activitiesKcal(activities: readonly ActivityEntry[], weights: readonly WeighIn[]): (number | null)[] {
  return activities.map((a) => {
    const kg = weightOn(weights, a.date);
    return kg === null ? null : activityKcal(sportMet(a.sport, a.intensity), kg, a.minutes);
  });
}
