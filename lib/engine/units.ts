/** Conversions d'unités. Tout est stocké en kg et en km ; l'affichage convertit. */

export const KG_PER_LB = 0.45359237;
export const KM_PER_MI = 1.609344;

export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function kgTo(unit: WeightUnit, kg: number): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

export function toKg(unit: WeightUnit, value: number): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function kmTo(unit: DistanceUnit, km: number): number {
  return unit === "km" ? km : km / KM_PER_MI;
}
