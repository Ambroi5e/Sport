import { isDeloadWeek, lastSession, loadIncrement, programWeek, suggestSets, type CatalogExercise, type PlannedSet, type Suggestion, type WeightUnit } from "@/lib/engine";
import type { Enums } from "@/lib/supabase/database.types";
import { formatWeight, MUSCLE_GROUPS, type ExerciseSummary } from "@/lib/training";

export type ExercisePreference = Enums<"exercise_preference">;

export const PREFERENCE_LABELS: Record<ExercisePreference, string> = { aime: "J'aime", evite: "À éviter" };

/** Choix proposés à la création d'un programme. */
export const PROGRAM_SESSIONS = [2, 3, 4, 5, 6] as const;
export const PROGRAM_MINUTES = [30, 45, 60, 75, 90] as const;
export const PROGRAM_WEEKS = [8, 12, 16] as const;
/** Matériel coché par défaut : celui d'une salle classique. */
export const DEFAULT_EQUIPMENT = ["barre", "halteres", "machine", "poulie", "poids_du_corps"];
/** Au-delà, tout devient prioritaire et plus rien ne l'est. */
export const MAX_PRIORITY_MUSCLES = 3;

/** Exercices possibles pour un objectif chiffré : ceux avec charge, par groupe musculaire. */
export function goalOptions(exercises: readonly Pick<ExerciseSummary, "id" | "name" | "measure" | "primary_muscles">[]) {
  return MUSCLE_GROUPS.map((g) => ({
    group: g.label,
    exercises: exercises.filter((e) => e.measure === "charge" && g.muscles.includes(e.primary_muscles[0])).map((e) => ({ id: e.id, name: e.name })),
  })).filter((g) => g.exercises.length > 0);
}

export function toCatalog(e: ExerciseSummary): CatalogExercise {
  return { id: e.id, name: e.name, equipment: e.equipment, measure: e.measure, primary: e.primary_muscles, secondary: e.secondary_muscles };
}

/** Version courte, dans la liste de la prochaine séance. */
export function suggestionShort(s: Suggestion, unit: WeightUnit): string {
  if (s.weightKg === null) return s.kind === "decharge" ? `${s.reps} reps, décharge` : "une rep de plus";
  const load = `${formatWeight(s.weightKg, unit)} ${unit}`;
  return s.kind === "monter" ? `${load} × ${s.reps}, charge en hausse` : s.kind === "decharge" ? `${load} × ${s.reps}, décharge` : `${load}, une rep de plus`;
}

/** Fourchette d'un exercice : « 4 × 6–10 ». */
export function planLabel(sets: number, repMin: number | null, repMax: number | null): string {
  if (repMin === null) return `${sets} séries`;
  return `${sets} × ${repMin}${repMax !== null && repMax !== repMin ? `–${repMax}` : ""}`;
}

/** Une phrase sous l'exercice en séance : ce qui est proposé, et pourquoi. */
export function suggestionText(s: Suggestion, unit: WeightUnit, target: { repMax: number }): string {
  const load = s.weightKg === null ? `${s.reps} reps` : `${formatWeight(s.weightKg, unit)} ${unit} × ${s.reps}`;
  switch (s.kind) {
    case "monter":
      return `Suggéré : ${load}. Tu as fait ${target.repMax} reps sur toutes tes séries, la charge monte.`;
    case "decharge":
      return s.weightKg === null ? `Semaine de décharge : ${load}, moins de séries.` : `Semaine de décharge : ${load}, charge allégée et moins de séries.`;
    default:
      return s.weightKg === null
        ? "Suggéré : une rep de plus par série que la dernière fois."
        : `Suggéré : ${formatWeight(s.weightKg, unit)} ${unit}, une rep de plus par série jusqu'à ${target.repMax}, puis la charge monte.`;
  }
}

const SPLIT_NAMES: Record<number, string> = { 2: "Full body", 4: "Haut / bas", 5: "Haut / bas et push / pull / jambes", 6: "Push / pull / jambes" };

/** Nom du programme d'après sa répartition (« Haut / bas, 4 séances »). */
export function programName(kinds: readonly string[]): string {
  const split = kinds.length === 3 ? (kinds[0] === "full" ? "Full body" : "Haut / bas") : (SPLIT_NAMES[kinds.length] ?? "Programme");
  return `${split}, ${kinds.length} séances`;
}

type HistorySet = { exerciseId: string; workoutId: string; date: string; setNumber: number; weightKg: number | null; reps: number | null; isWarmup?: boolean };
type ProgramLine = {
  exerciseId: string;
  sets: number;
  repMin: number | null;
  repMax: number | null;
  exercise: { equipment: string; measure: string; primary_muscles: readonly string[] } | null;
};

/**
 * Charge suggérée de chaque exercice d'une séance du programme, à la date de la
 * séance. La référence est la dernière séance hors semaines de décharge. Rien pour
 * un exercice en durée ou sans fourchette de reps : il garde le préremplissage habituel.
 */
export function programSuggestions(
  history: readonly HistorySet[],
  lines: readonly ProgramLine[],
  program: { starts_on: string; deload_every: number },
  date: string,
): ({ suggestion: Suggestion | null; sets: PlannedSet[] } | null)[] {
  const inDeload = (d: string) => d >= program.starts_on && isDeloadWeek(programWeek(program.starts_on, d), program.deload_every);
  const deload = inDeload(date);
  return lines.map((line) => {
    if (!line.exercise || line.exercise.measure === "duree" || line.repMin === null || line.repMax === null) return null;
    const last = lastSession(
      history.filter((s) => s.exerciseId === line.exerciseId),
      inDeload,
    );
    const increment = loadIncrement({ equipment: line.exercise.equipment, primary: line.exercise.primary_muscles });
    return suggestSets(last, { sets: line.sets, repMin: line.repMin, repMax: line.repMax }, increment, deload);
  });
}
