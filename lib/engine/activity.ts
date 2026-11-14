/**
 * Sports additionnels : dépense estimée par les MET.
 *
 * Valeurs du Compendium des activités physiques 2024 (Herrmann et al., pacompendium.com,
 * section Sports), une par niveau d'intensité : légère, modérée, intense. Entre
 * parenthèses, le code du Compendium ; « milieu » quand le Compendium ne donne que le
 * loisir et la compétition. Le padel n'a pas de code : il prend le tennis en double
 * et le paddleball.
 *
 * Endurance (v0.11) : mêmes sections du Compendium (Running, Walking, Bicycling,
 * Water Activities, Conditioning Exercise). Hyrox (v0.11.1) : Conditioning Exercise. Une course ou une marche dont on connaît
 * la distance prend le MET de sa vitesse (`speedMet`) plutôt que celui de l'intensité.
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
  course: [7.5, 9.3, 11.8], // footing à son rythme (12020), 9,7 à 10,1 km/h (12050), 12 km/h (12080)
  trail: [6.0, 9.3, 10.5], // randonnée tout-terrain (17080), cross-country (12140), course à son rythme (12145)
  velo: [4.3, 7.0, 9.0], // à son rythme : facile (01015), modéré (01016), soutenu (01017)
  natation: [5.8, 8.0, 9.8], // longueurs lentes (18240), crawl moyen (18290), longueurs rapides (18230)
  rameur: [5.0, 7.5, 11.0], // moins de 100 W (02071), 100 à 149 W (02072), 150 à 199 W (02073)
  marche: [3.8, 4.8, 6.0], // 4,5 à 5,5 km/h (17190), 5,6 à 6,3 km/h (17200), randonnée tout-terrain (17080)
  hyrox: [5.0, 7.5, 11.0], // circuit modéré (02035), circuit soutenu (02040), intervalles à haute intensité (02214)
  autre: [4.0, 6.0, 8.0], // repères : 3 à 6 MET modéré, 6 et plus vigoureux
};

/**
 * MET selon la vitesse, à plat : [km/h au milieu de la tranche du Compendium, MET].
 * Course : codes 12026 à 12132. Marche sur sol ferme : codes 17151 à 17231.
 */
const SPEED_METS: Readonly<Record<string, readonly (readonly [kmh: number, met: number])[]>> = {
  course: [
    [5.1, 3.3], [6.6, 6.5], [7.3, 7.8], [8.2, 8.5], [9.1, 9.0], [9.9, 9.3], [10.8, 10.5], [11.3, 11.0],
    [12.1, 11.8], [12.9, 12.0], [13.8, 12.5], [14.5, 13.0], [16.1, 14.8], [17.7, 16.8], [19.3, 18.5],
  ],
  marche: [[2.8, 2.3], [3.5, 2.8], [4.0, 3.0], [5.0, 3.8], [6.0, 4.8], [6.8, 5.5], [7.6, 7.0], [8.4, 8.5]],
};

/** MET de la tranche de vitesse la plus proche ; `null` pour un sport sans table ou une vitesse nulle. */
export function speedMet(sport: string, kmh: number): number | null {
  const table = SPEED_METS[sport];
  if (!table || !(kmh > 0)) return null;
  return table.reduce((best, row) => (Math.abs(row[0] - kmh) < Math.abs(best[0] - kmh) ? row : best))[1];
}

/** MET d'une activité : celui de sa vitesse quand la distance le permet, sinon celui de son intensité. */
export function activityMet(sport: string, intensity: Intensity, distanceM?: number | null, seconds?: number | null): number {
  const bySpeed = distanceM && seconds ? speedMet(sport, distanceM / 1000 / (seconds / 3600)) : null;
  return bySpeed ?? sportMet(sport, intensity);
}

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

/** `distanceM` et `seconds` (durée exacte) : seulement pour une sortie d'endurance mesurée. */
export type ActivityEntry = { date: string; sport: string; minutes: number; intensity: Intensity; distanceM?: number | null; seconds?: number | null };

/** Dépense estimée de chaque activité, `null` quand aucune pesée ne permet de l'estimer. */
export function activitiesKcal(activities: readonly ActivityEntry[], weights: readonly WeighIn[]): (number | null)[] {
  return activities.map((a) => {
    const kg = weightOn(weights, a.date);
    return kg === null ? null : activityKcal(activityMet(a.sport, a.intensity, a.distanceM, a.seconds), kg, (a.seconds ?? a.minutes * 60) / 60);
  });
}
