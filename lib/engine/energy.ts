/** Dépense énergétique : métabolisme de base (Mifflin-St Jeor) et TDEE. */

export type Sex = "homme" | "femme" | "autre";

/** Facteurs d'activité usuels appliqués au métabolisme de base. */
export const ACTIVITY_FACTORS = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;

export function ageFromBirthYear(birthYear: number, today: Date): number {
  return today.getUTCFullYear() - birthYear;
}

/**
 * Métabolisme de base en kcal/jour (Mifflin-St Jeor, 1990).
 * Pour « autre », on prend la moyenne des deux constantes.
 */
export function bmrMifflin(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const constant = p.sex === "homme" ? 5 : p.sex === "femme" ? -161 : -78;
  return base + constant;
}

/** Niveau d'activité déduit du nombre de séances par semaine. */
export function activityFromSessions(sessionsPerWeek: number): ActivityLevel {
  if (sessionsPerWeek <= 0) return "sedentaire";
  if (sessionsPerWeek <= 2) return "leger";
  if (sessionsPerWeek <= 4) return "modere";
  if (sessionsPerWeek <= 6) return "actif";
  return "tres_actif";
}

export function tdee(bmr: number, level: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[level];
}
