/** Force : 1RM estimé. */

/**
 * 1RM estimé par la formule d'Epley : charge × (1 + reps / 30).
 * Une série de 1 rep renvoie la charge elle-même. Au-delà de 12 reps
 * l'estimation devient peu fiable ; elle reste calculée mais à afficher avec prudence.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
