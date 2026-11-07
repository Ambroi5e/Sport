import { kgTo, type WeightUnit } from "@/lib/engine";
import type { Enums } from "@/lib/supabase/database.types";

export type Muscle = Enums<"muscle">;
export type Equipment = Enums<"equipment">;
export type ExerciseMeasure = Enums<"exercise_measure">;

export const MUSCLE_LABELS: Record<Muscle, string> = {
  pectoraux: "Pectoraux",
  dorsaux: "Dorsaux",
  trapezes: "Trapèzes",
  lombaires: "Lombaires",
  epaules_avant: "Épaules (avant)",
  epaules_laterales: "Épaules (côtés)",
  epaules_arriere: "Épaules (arrière)",
  biceps: "Biceps",
  triceps: "Triceps",
  avant_bras: "Avant-bras",
  abdominaux: "Abdominaux",
  obliques: "Obliques",
  quadriceps: "Quadriceps",
  ischios: "Ischios",
  fessiers: "Fessiers",
  adducteurs: "Adducteurs",
  mollets: "Mollets",
};

/** Regroupements pour filtrer la bibliothèque. */
export const MUSCLE_GROUPS: { id: string; label: string; muscles: Muscle[] }[] = [
  { id: "pecs", label: "Pecs", muscles: ["pectoraux"] },
  { id: "dos", label: "Dos", muscles: ["dorsaux", "trapezes", "lombaires"] },
  { id: "epaules", label: "Épaules", muscles: ["epaules_avant", "epaules_laterales", "epaules_arriere"] },
  { id: "bras", label: "Bras", muscles: ["biceps", "triceps", "avant_bras"] },
  { id: "abdos", label: "Abdos", muscles: ["abdominaux", "obliques"] },
  { id: "jambes", label: "Jambes", muscles: ["quadriceps", "ischios", "fessiers", "adducteurs", "mollets"] },
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barre: "Barre",
  halteres: "Haltères",
  machine: "Machine",
  poulie: "Poulie",
  poids_du_corps: "Poids du corps",
  kettlebell: "Kettlebell",
  elastique: "Élastique",
  autre: "Autre",
};

export const MEASURE_LABELS: Record<ExerciseMeasure, string> = {
  charge: "Charge et répétitions",
  poids_du_corps: "Répétitions (lest facultatif)",
  duree: "Durée",
};

export type ExerciseSummary = {
  id: string;
  name: string;
  equipment: Equipment;
  measure: ExerciseMeasure;
  primary_muscles: Muscle[];
  secondary_muscles: Muscle[];
  user_id: string | null;
};

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Charge stockée en kg, affichée dans l'unité de l'utilisateur (« 82,5 »). */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return numberFormat.format(Math.round(kgTo(unit, kg) * 10) / 10);
}

/** Volume en tonnes au-delà de 10 000 kg (« 12,4 t »), sinon en kg. */
export function formatVolume(kg: number, unit: WeightUnit): string {
  const value = kgTo(unit, kg);
  if (unit === "kg" && value >= 10_000) return `${numberFormat.format(Math.round(value / 100) / 10)} t`;
  return `${integerFormat.format(value)} ${unit}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, "0")}`;
}

/** Durée d'une séance à partir de ses horodatages (« 1 h 05 », « 48 min »). */
export function formatElapsed(startedAt: string, endedAt: string | null): string | null {
  if (!endedAt) return null;
  const minutes = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** Résumé d'une série : « 80 × 10 », « 12 reps », « 45 s ». */
export function formatSet(
  set: { weightKg: number | null; reps: number | null; durationSeconds?: number | null },
  unit: WeightUnit,
): string {
  if (set.durationSeconds) {
    return set.weightKg ? `${formatDuration(set.durationSeconds)} à ${formatWeight(set.weightKg, unit)} ${unit}` : formatDuration(set.durationSeconds);
  }
  if (set.weightKg && set.weightKg > 0) return `${formatWeight(set.weightKg, unit)} × ${set.reps ?? 0}`;
  return `${set.reps ?? 0} reps`;
}
