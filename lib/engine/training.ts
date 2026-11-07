/** Musculation : volume, records, séries par muscle, préremplissage des séries. */

import { epley1RM } from "./strength";

/** Une série validée, telle que le moteur la lit. */
export type SetEntry = {
  exerciseId: string;
  workoutId: string;
  /** Date de la séance, AAAA-MM-JJ. */
  date: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds?: number | null;
  isWarmup?: boolean;
};

/** Au-delà, l'estimation du 1RM devient trop imprécise pour compter comme record. */
export const E1RM_MAX_REPS = 12;

/** Repère général de séries par muscle et par semaine (hypertrophie), pas une prescription. */
export const WEEKLY_SETS_LANDMARK = { min: 10, max: 20 } as const;

export type ExerciseRecords = {
  bestE1RM: { value: number; weightKg: number; reps: number; date: string } | null;
  heaviest: { weightKg: number; reps: number; date: string } | null;
  mostReps: { reps: number; weightKg: number; date: string } | null;
  longest: { seconds: number; date: string } | null;
  bestSessionVolume: { volume: number; date: string; workoutId: string } | null;
};

export type RecordKind = "e1rm" | "charge" | "reps" | "duree";

export type VolumeZone = "bas" | "repere" | "haut";

const EPSILON = 1e-9;

function working(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => !s.isWarmup);
}

function chronological(sets: SetEntry[]): SetEntry[] {
  return [...sets].sort((a, b) => a.date.localeCompare(b.date));
}

/** Volume d'une série : charge × répétitions. Une série sans charge compte 0. */
export function setVolume(set: Pick<SetEntry, "weightKg" | "reps">): number {
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

/** Volume total (charge × répétitions), échauffements exclus. */
export function totalVolume(sets: SetEntry[]): number {
  return working(sets).reduce((sum, s) => sum + setVolume(s), 0);
}

/** 1RM estimé d'une série, ou null si elle ne peut pas servir d'estimation. */
export function setE1RM(set: Pick<SetEntry, "weightKg" | "reps">): number | null {
  const { weightKg, reps } = set;
  if (!weightKg || weightKg <= 0 || !reps || reps < 1 || reps > E1RM_MAX_REPS) return null;
  return epley1RM(weightKg, reps);
}

/**
 * Records d'un exercice. À égalité, le record le plus ancien reste : battre un
 * record demande de faire strictement mieux.
 */
export function exerciseRecords(sets: SetEntry[]): ExerciseRecords {
  const records: ExerciseRecords = { bestE1RM: null, heaviest: null, mostReps: null, longest: null, bestSessionVolume: null };
  const volumeBySession = new Map<string, { volume: number; date: string }>();

  for (const s of chronological(working(sets))) {
    const e1rm = setE1RM(s);
    if (e1rm !== null && (!records.bestE1RM || e1rm > records.bestE1RM.value + EPSILON)) {
      records.bestE1RM = { value: e1rm, weightKg: s.weightKg!, reps: s.reps!, date: s.date };
    }

    if (s.weightKg && s.weightKg > 0 && s.reps && s.reps > 0) {
      const h = records.heaviest;
      if (!h || s.weightKg > h.weightKg + EPSILON || (Math.abs(s.weightKg - h.weightKg) < EPSILON && s.reps > h.reps)) {
        records.heaviest = { weightKg: s.weightKg, reps: s.reps, date: s.date };
      }
    }

    if (s.reps && s.reps > 0) {
      const m = records.mostReps;
      const weight = s.weightKg ?? 0;
      if (!m || s.reps > m.reps || (s.reps === m.reps && weight > m.weightKg + EPSILON)) {
        records.mostReps = { reps: s.reps, weightKg: weight, date: s.date };
      }
    }

    if (s.durationSeconds && s.durationSeconds > 0 && (!records.longest || s.durationSeconds > records.longest.seconds)) {
      records.longest = { seconds: s.durationSeconds, date: s.date };
    }

    const session = volumeBySession.get(s.workoutId) ?? { volume: 0, date: s.date };
    session.volume += setVolume(s);
    volumeBySession.set(s.workoutId, session);
  }

  for (const [workoutId, { volume, date }] of volumeBySession) {
    if (volume > 0 && (!records.bestSessionVolume || volume > records.bestSessionVolume.volume + EPSILON)) {
      records.bestSessionVolume = { volume, date, workoutId };
    }
  }

  return records;
}

/**
 * Records battus par une nouvelle série. La toute première fois qu'on fait un
 * exercice ne compte pas comme record : il n'y a rien à battre.
 * Le record de répétitions ne vaut que sans charge (tractions, pompes) ;
 * avec charge, c'est le 1RM estimé qui départage.
 */
export function newRecords(previous: ExerciseRecords, set: SetEntry): RecordKind[] {
  if (set.isWarmup) return [];
  const kinds: RecordKind[] = [];

  const e1rm = setE1RM(set);
  if (e1rm !== null && previous.bestE1RM && e1rm > previous.bestE1RM.value + EPSILON) kinds.push("e1rm");

  if (set.weightKg && set.reps && previous.heaviest && set.weightKg > previous.heaviest.weightKg + EPSILON) kinds.push("charge");

  const unloaded = !set.weightKg || set.weightKg <= 0;
  if (unloaded && set.reps && previous.mostReps && set.reps > previous.mostReps.reps) kinds.push("reps");

  if (set.durationSeconds && previous.longest && set.durationSeconds > previous.longest.seconds) kinds.push("duree");

  return kinds;
}

/** Meilleure série d'une liste (1RM estimé le plus haut, sinon le plus de répétitions). */
export function bestSet<T extends Pick<SetEntry, "weightKg" | "reps" | "isWarmup">>(sets: T[]): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const s of sets) {
    if (s.isWarmup) continue;
    const score = setE1RM(s) ?? (s.reps ?? 0) / 1000;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Séries effectives par muscle : 1 pour chaque muscle principal, 0,5 pour
 * chaque muscle secondaire. Les échauffements ne comptent pas.
 */
export function setsPerMuscle(
  sets: SetEntry[],
  muscles: Record<string, { primary: readonly string[]; secondary: readonly string[] }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of working(sets)) {
    const m = muscles[s.exerciseId];
    if (!m) continue;
    for (const muscle of m.primary) out[muscle] = (out[muscle] ?? 0) + 1;
    for (const muscle of m.secondary) out[muscle] = (out[muscle] ?? 0) + 0.5;
  }
  return out;
}

/** Position d'un nombre de séries hebdomadaires par rapport au repère général. */
export function volumeZone(weeklySets: number): VolumeZone {
  if (weeklySets < WEEKLY_SETS_LANDMARK.min) return "bas";
  if (weeklySets > WEEKLY_SETS_LANDMARK.max) return "haut";
  return "repere";
}

export type PreviousSet = { setNumber: number; weightKg: number | null; reps: number | null; durationSeconds?: number | null };

export type PlannedSet = {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  repMin: number | null;
  repMax: number | null;
};

/**
 * Séries préremplies pour un exercice : la dernière performance, série par
 * série, sinon la cible du modèle. Sans historique ni modèle : 3 séries vides.
 */
export function prefillSets(
  last: PreviousSet[],
  target: { sets?: number | null; repMin?: number | null; repMax?: number | null } = {},
): PlannedSet[] {
  const sorted = [...last].sort((a, b) => a.setNumber - b.setNumber);
  const count = target.sets ?? (sorted.length || 3);
  return Array.from({ length: count }, (_, i) => {
    const source = sorted[i] ?? sorted.at(-1);
    return {
      setNumber: i + 1,
      weightKg: source?.weightKg ?? null,
      reps: source?.reps ?? target.repMin ?? null,
      durationSeconds: source?.durationSeconds ?? null,
      repMin: target.repMin ?? null,
      repMax: target.repMax ?? null,
    };
  });
}
