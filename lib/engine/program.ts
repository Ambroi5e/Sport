/**
 * Plan prédictif : génération du programme, charge suggérée (double progression),
 * semaines de décharge et projection vers un objectif chiffré. Des règles
 * explicables, sans hasard : les mêmes réglages donnent le même programme.
 */

import type { PlannedSet, PreviousSet } from "./training";
import { roundTo } from "./units";

const DAY_MS = 86_400_000;

function dayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function shift(date: string, days: number): string {
  return new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

// Génération ----------------------------------------------------------------------

export type CatalogExercise = {
  id: string;
  name: string;
  equipment: string;
  measure: string;
  primary: readonly string[];
  secondary: readonly string[];
};

export type ProgramInput = {
  sessionsPerWeek: number;
  sessionMinutes: number;
  /** Matériel disponible. */
  equipment: readonly string[];
  /** Muscles prioritaires. */
  priority: readonly string[];
  /** Objectif de force : fourchettes basses sur les gros exercices. */
  strength?: boolean;
  liked?: ReadonlySet<string>;
  avoided?: ReadonlySet<string>;
  /** Nombre de séances où chaque exercice a déjà été fait. */
  usage?: Readonly<Record<string, number>>;
  /** Exercice de l'objectif chiffré : présent dès que son muscle est travaillé. */
  goalExerciseId?: string | null;
};

export type ProgramItem = { exerciseId: string; muscle: string; sets: number; repMin: number; repMax: number };
export type ProgramSession = { name: string; items: ProgramItem[] };

type SessionKind = "full" | "haut" | "bas" | "push" | "pull" | "jambes";

export const LOWER_MUSCLES: ReadonlySet<string> = new Set(["quadriceps", "ischios", "fessiers", "adducteurs", "mollets"]);
const SMALL_MUSCLES: ReadonlySet<string> = new Set([
  "epaules_laterales",
  "epaules_arriere",
  "biceps",
  "triceps",
  "avant_bras",
  "mollets",
  "abdominaux",
  "obliques",
  "trapezes",
]);

/** Muscles visés par chaque type de séance, dans l'ordre où on les travaille. */
const SLOTS: Record<SessionKind, string[]> = {
  full: ["quadriceps", "pectoraux", "dorsaux", "ischios", "epaules_laterales", "biceps", "triceps", "abdominaux"],
  haut: ["pectoraux", "dorsaux", "pectoraux", "dorsaux", "epaules_laterales", "triceps", "biceps", "epaules_avant", "epaules_arriere"],
  // Les fessiers travaillent déjà en principal au squat, au soulevé de terre et à la presse : leur place vient tard.
  bas: ["quadriceps", "ischios", "quadriceps", "ischios", "mollets", "abdominaux", "fessiers", "adducteurs"],
  push: ["pectoraux", "epaules_avant", "pectoraux", "epaules_laterales", "triceps", "triceps", "abdominaux"],
  pull: ["dorsaux", "dorsaux", "epaules_arriere", "biceps", "trapezes", "biceps", "abdominaux"],
  jambes: ["quadriceps", "ischios", "fessiers", "quadriceps", "mollets", "ischios", "abdominaux"],
};

const KIND_LABELS: Record<SessionKind, string> = { full: "Full body", haut: "Haut", bas: "Bas", push: "Push", pull: "Pull", jambes: "Jambes" };

/**
 * Répartition des séances sur la semaine. À 3 séances, deux séances du haut si
 * les priorités sont toutes au-dessus de la ceinture (deux du bas si elles sont
 * toutes aux jambes), sinon trois full body.
 */
export function splitFor(sessionsPerWeek: number, priority: readonly string[]): SessionKind[] {
  const n = Math.min(6, Math.max(2, Math.round(sessionsPerWeek)));
  const upper = priority.length > 0 && priority.every((m) => !LOWER_MUSCLES.has(m));
  const lower = priority.length > 0 && priority.every((m) => LOWER_MUSCLES.has(m));
  switch (n) {
    case 2:
      return ["full", "full"];
    case 3:
      return upper ? ["haut", "bas", "haut"] : lower ? ["bas", "haut", "bas"] : ["full", "full", "full"];
    case 4:
      return ["haut", "bas", "haut", "bas"];
    case 5:
      return ["haut", "bas", "push", "pull", "jambes"];
    default:
      return ["push", "pull", "jambes", "push", "pull", "jambes"];
  }
}

/** Environ 3 minutes par série, repos compris. */
export function setsBudget(sessionMinutes: number): number {
  return Math.max(9, Math.floor(sessionMinutes / 3));
}

function isCompound(e: CatalogExercise): boolean {
  return e.primary.length + e.secondary.length >= 3;
}

/**
 * Muscles de la séance. Les gros muscles prioritaires passent en tête, les petits
 * juste après les deux premiers exercices ; chacun prend une place de plus, deux
 * places au plus par muscle.
 */
function orderedSlots(kind: SessionKind, priority: readonly string[]): string[] {
  const base = SLOTS[kind];
  const pri = priority.filter((m) => base.includes(m));
  const rest = [...base];
  for (const m of pri) rest.splice(rest.indexOf(m), 1);
  const big = pri.filter((m) => !SMALL_MUSCLES.has(m));
  const small = pri.filter((m) => SMALL_MUSCLES.has(m));
  const head = [...big, ...big, ...rest];
  const out = [...head.slice(0, 2), ...small, ...small, ...head.slice(2)];
  const seen: Record<string, number> = {};
  return out.filter((m) => (seen[m] = (seen[m] ?? 0) + 1) <= 2);
}

const LATE_EQUIPMENT: Readonly<Record<string, number>> = { machine: 3, poulie: 3, barre: 3, halteres: 1 };

/**
 * Note d'un exercice pour une place de la séance. Les deux premières places vont
 * aux gros polyarticulaires, plutôt à la barre ; les suivantes aux exercices
 * guidés (barre, machine, poulie) qui sollicitent plusieurs muscles ; les petits
 * muscles aux exercices d'isolation. Puis les habitudes.
 */
function slotScore(e: CatalogExercise, muscle: string, position: number, usage: number): number {
  const compound = isCompound(e);
  const fit = SMALL_MUSCLES.has(muscle)
    ? compound
      ? 0
      : 10
    : position < 2
      ? (compound ? 60 : 0) + (e.equipment === "barre" ? 2 : 0)
      : Math.min(2, e.primary.length + e.secondary.length - 1) + (LATE_EQUIPMENT[e.equipment] ?? 0);
  return fit + Math.min(usage, 20) + (e.primary[0] === muscle ? 5 : 0);
}

/** Points perdus par séance de la semaine où l'exercice figure déjà : les variantes A et B changent d'exercices. */
const REPEAT_PENALTY = 8;

/**
 * Génère les séances d'une semaine type. Pour chaque muscle visé : les exercices
 * faisables avec le matériel, sans ceux à éviter ; ceux qu'on aime (et l'exercice
 * de l'objectif) d'abord, puis la note de la place. Un exercice déjà pris dans la
 * semaine perd des points, ce qui varie les séances d'un même type.
 */
export function buildProgram(catalog: readonly CatalogExercise[], input: ProgramInput): ProgramSession[] {
  const kinds = splitFor(input.sessionsPerWeek, input.priority);
  const budget = setsBudget(input.sessionMinutes);
  const count = Math.min(8, Math.max(3, Math.round(budget / 3.5)));
  const liked = new Set(input.liked ?? []);
  if (input.goalExerciseId) liked.add(input.goalExerciseId);
  const avoided = input.avoided ?? new Set<string>();
  const usage = input.usage ?? {};
  const available = catalog.filter((e) => input.equipment.includes(e.equipment) && !avoided.has(e.id) && e.measure !== "duree");
  const kindCount = kinds.map((k, i) => kinds.slice(0, i).filter((x) => x === k).length);
  const several = (k: SessionKind) => kinds.filter((x) => x === k).length > 1;
  const weekUse: Record<string, number> = {};

  return kinds.map((kind, s) => {
    const variant = kindCount[s];
    const items: ProgramItem[] = [];
    for (const muscle of orderedSlots(kind, input.priority)) {
      if (items.length >= count) break;
      const position = items.length;
      const pick = available
        .filter((e) => e.primary.includes(muscle) && !items.some((it) => it.exerciseId === e.id))
        .map((e) => ({ e, score: (liked.has(e.id) ? 1000 : 0) + slotScore(e, muscle, position, usage[e.id] ?? 0) - REPEAT_PENALTY * (weekUse[e.id] ?? 0) }))
        .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, "fr"))[0]?.e;
      if (!pick) continue;
      weekUse[pick.id] = (weekUse[pick.id] ?? 0) + 1;
      const heavy = position < 2 && isCompound(pick) && !SMALL_MUSCLES.has(muscle);
      // Fourchette basse de force à la barre seulement : 3 à 6 reps aux haltères ou au poids du corps n'a guère de sens.
      const [repMin, repMax] = heavy ? (input.strength && pick.equipment === "barre" ? [3, 6] : [6, 10]) : SMALL_MUSCLES.has(muscle) ? [10, 15] : [8, 12];
      items.push({ exerciseId: pick.id, muscle, sets: 3, repMin, repMax });
    }

    // Séries restantes : d'abord aux muscles prioritaires, puis aux deux premiers exercices.
    let left = budget - items.reduce((sum, it) => sum + it.sets, 0);
    const order = [...items.filter((it) => input.priority.includes(it.muscle)), ...items.slice(0, 2)];
    for (let pass = 0; pass < 2 && left > 0; pass++) {
      for (const it of order) {
        if (left <= 0) break;
        if (it.sets >= 5) continue;
        it.sets += 1;
        left -= 1;
      }
    }

    const name = several(kind) ? `${KIND_LABELS[kind]} ${"ABC"[variant]}` : KIND_LABELS[kind];
    return { name, items };
  });
}

/** Séries prévues par muscle et par semaine : 1 par muscle principal, 0,5 par muscle secondaire. */
export function plannedSetsPerMuscle(sessions: { items: { exerciseId: string; sets: number }[] }[], catalog: readonly CatalogExercise[]): Record<string, number> {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const out: Record<string, number> = {};
  for (const s of sessions) {
    for (const it of s.items) {
      const e = byId.get(it.exerciseId);
      if (!e) continue;
      for (const m of e.primary) out[m] = (out[m] ?? 0) + it.sets;
      for (const m of e.secondary) out[m] = (out[m] ?? 0) + it.sets * 0.5;
    }
  }
  return out;
}

/** Exercices équivalents : mêmes muscles principaux, faisables avec le matériel, sans ceux à éviter. */
export function equivalentExercises(
  exercise: CatalogExercise,
  catalog: readonly CatalogExercise[],
  options: { equipment?: readonly string[]; avoided?: ReadonlySet<string>; liked?: ReadonlySet<string> } = {},
): CatalogExercise[] {
  const main = exercise.primary[0];
  return catalog
    .filter(
      (e) =>
        e.id !== exercise.id &&
        e.primary.includes(main) &&
        e.measure === exercise.measure &&
        (!options.equipment || options.equipment.includes(e.equipment)) &&
        !options.avoided?.has(e.id),
    )
    .map((e) => ({
      e,
      score: (options.liked?.has(e.id) ? 100 : 0) + e.primary.filter((m) => exercise.primary.includes(m)).length * 10 - Math.abs(e.primary.length - exercise.primary.length),
    }))
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, "fr"))
    .map((x) => x.e);
}

// Charge suggérée -----------------------------------------------------------------

/** Pas de charge : 5 kg à la barre pour les jambes, 2 kg aux haltères, 4 kg au kettlebell, 2,5 kg sinon. */
export function loadIncrement(exercise: Pick<CatalogExercise, "equipment" | "primary">): number {
  if (exercise.equipment === "barre" && exercise.primary.some((m) => LOWER_MUSCLES.has(m))) return 5;
  if (exercise.equipment === "halteres") return 2;
  if (exercise.equipment === "kettlebell") return 4;
  return 2.5;
}

export type Suggestion = {
  /** Charge proposée, ou null pour un exercice au poids du corps sans lest. */
  weightKg: number | null;
  reps: number;
  kind: "monter" | "repeter" | "decharge";
};

/**
 * Double progression. Si toutes les séries à la charge la plus lourde de la
 * dernière séance ont atteint le haut de la fourchette, la charge monte d'un pas
 * et les reps repartent du bas. Sinon, même charge et une rep de plus sur la
 * série la plus faible. En semaine de décharge : charge −10 %, bas de fourchette.
 */
export function suggestNext(
  last: readonly { weightKg: number | null; reps: number | null }[],
  target: { repMin: number; repMax: number },
  increment: number,
  deload = false,
): Suggestion | null {
  const sets = last.filter((s) => (s.reps ?? 0) > 0);
  if (sets.length === 0) return null;
  const top = Math.max(...sets.map((s) => s.weightKg ?? 0));
  const atTop = sets.filter((s) => (s.weightKg ?? 0) === top);
  const weakest = Math.min(...atTop.map((s) => s.reps!));
  const loaded = top > 0;

  if (deload) {
    return { weightKg: loaded ? roundTo(top * 0.9, increment === 5 ? 2.5 : increment) : null, reps: target.repMin, kind: "decharge" };
  }
  if (loaded && weakest >= target.repMax) return { weightKg: top + increment, reps: target.repMin, kind: "monter" };
  return { weightKg: loaded ? top : null, reps: loaded ? Math.min(target.repMax, weakest + 1) : weakest + 1, kind: "repeter" };
}

/** Séries d'une semaine de décharge : 60 % des séries prévues. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * 0.6));
}

/**
 * Séries de travail de la dernière séance qui compte pour la progression. Les
 * séances des semaines de décharge sont écartées : après une décharge, on repart
 * des charges d'avant, et la deuxième séance d'une semaine de décharge ne baisse
 * pas une seconde fois.
 */
export function lastSession<T extends { workoutId: string; date: string; setNumber: number; isWarmup?: boolean }>(
  sets: readonly T[],
  skip: (date: string) => boolean = () => false,
): T[] {
  let latest: T | null = null;
  for (const s of sets) {
    if (s.isWarmup || skip(s.date)) continue;
    if (!latest || s.date > latest.date) latest = s;
  }
  if (!latest) return [];
  return sets.filter((s) => s.workoutId === latest.workoutId && !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Séries préremplies d'un exercice du programme, d'après la suggestion. On monte
 * ou on décharge : toutes les séries à la nouvelle charge, en bas de fourchette.
 * On répète : chaque série reprend sa charge avec une rep de plus. Sans historique,
 * les séries partent vides au bas de la fourchette.
 */
export function suggestSets(
  last: readonly PreviousSet[],
  target: { sets: number; repMin: number; repMax: number },
  increment: number,
  deload = false,
): { suggestion: Suggestion | null; sets: PlannedSet[] } {
  const count = deload ? deloadSets(target.sets) : target.sets;
  const suggestion = suggestNext(last, target, increment, deload);
  const sorted = [...last].sort((a, b) => a.setNumber - b.setNumber);
  const sets = Array.from({ length: count }, (_, i): PlannedSet => {
    const source = sorted[i] ?? sorted.at(-1);
    const base = { setNumber: i + 1, durationSeconds: null, repMin: target.repMin, repMax: target.repMax };
    if (!suggestion || !source) return { ...base, weightKg: source?.weightKg ?? null, reps: source?.reps ?? target.repMin };
    if (suggestion.kind !== "repeter") return { ...base, weightKg: suggestion.weightKg, reps: suggestion.reps };
    const reps = (source.reps ?? target.repMin) + 1;
    return { ...base, weightKg: source.weightKg, reps: source.weightKg ? Math.min(target.repMax, reps) : reps };
  });
  return { suggestion, sets };
}

/** Semaine du programme (1 la première), d'après sa date de début. */
export function programWeek(startsOn: string, today: string): number {
  return Math.max(1, Math.floor((dayIndex(today) - dayIndex(startsOn)) / 7) + 1);
}

export function isDeloadWeek(week: number, deloadEvery: number): boolean {
  return deloadEvery > 0 && week % deloadEvery === 0;
}

/**
 * Prochaine séance du programme : celle qui suit la dernière faite. Une séance
 * ratée ne bloque rien, le programme reprend où on en est.
 */
export function nextSessionIndex(sessionIds: readonly string[], lastDoneId: string | null): number {
  const i = lastDoneId ? sessionIds.indexOf(lastDoneId) : -1;
  return sessionIds.length === 0 ? -1 : (i + 1) % sessionIds.length;
}

// Projection ----------------------------------------------------------------------

/** Progression hebdomadaire de repère du 1RM estimé, selon le niveau. */
export const WEEKLY_GAIN: Readonly<Record<string, number>> = { debutant: 0.015, intermediaire: 0.0075, avance: 0.0035 };

/** Au-delà, une pente mesurée est jugée peu réaliste et plafonnée. */
const MAX_WEEKLY_GAIN = 0.03;

export type Projection = {
  /** 1RM estimé actuel : le meilleur des 14 derniers jours, sinon le plus récent. */
  current: number;
  /** Progression prévue en kg par semaine hors décharge. */
  weeklyGain: number;
  source: "mesure" | "repere";
  /** Une valeur par semaine, d'aujourd'hui à l'horizon. */
  points: { date: string; value: number }[];
  /** Date estimée où la projection atteint l'objectif, ou null au-delà de l'horizon. */
  reachedOn: string | null;
};

/**
 * Projection du 1RM estimé vers un objectif. La pente vient des 6 dernières
 * semaines quand il y a au moins 3 séances sur 14 jours ou plus et qu'elle
 * monte ; sinon d'un repère selon le niveau. Les semaines de décharge restent à plat.
 */
export function projectE1RM(p: {
  history: readonly { date: string; e1rm: number }[];
  today: string;
  targetKg: number;
  level?: string | null;
  startsOn: string;
  deloadEvery: number;
  horizonWeeks?: number;
}): Projection | null {
  if (p.history.length === 0) return null;
  const sorted = [...p.history].sort((a, b) => a.date.localeCompare(b.date));
  const end = dayIndex(p.today);
  const recent = sorted.filter((h) => dayIndex(h.date) > end - 14 && dayIndex(h.date) <= end);
  const current = recent.length ? Math.max(...recent.map((h) => h.e1rm)) : sorted[sorted.length - 1].e1rm;

  const window = sorted.filter((h) => dayIndex(h.date) > end - 42 && dayIndex(h.date) <= end);
  let measured: number | null = null;
  if (window.length >= 3 && dayIndex(window[window.length - 1].date) - dayIndex(window[0].date) >= 14) {
    const xs = window.map((h) => dayIndex(h.date));
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = window.reduce((a, h) => a + h.e1rm, 0) / window.length;
    let num = 0;
    let den = 0;
    window.forEach((h, i) => {
      num += (xs[i] - meanX) * (h.e1rm - meanY);
      den += (xs[i] - meanX) ** 2;
    });
    const slope = (num / den) * 7;
    if (slope > 0) measured = Math.min(slope, current * MAX_WEEKLY_GAIN);
  }
  const weeklyGain = measured ?? current * (WEEKLY_GAIN[p.level ?? ""] ?? WEEKLY_GAIN.intermediaire);
  const horizon = p.horizonWeeks ?? 104;

  const points = [{ date: p.today, value: current }];
  let value = current;
  let reachedOn: string | null = current >= p.targetKg ? p.today : null;
  for (let w = 1; w <= horizon; w++) {
    const date = shift(p.today, 7 * w);
    if (!isDeloadWeek(programWeek(p.startsOn, shift(date, -1)), p.deloadEvery)) value += weeklyGain;
    points.push({ date, value });
    if (reachedOn === null && value >= p.targetKg) reachedOn = date;
    if (reachedOn !== null && w >= 4 && dayIndex(date) - dayIndex(reachedOn) >= 28) break;
  }
  return { current, weeklyGain, source: measured === null ? "repere" : "mesure", points, reachedOn };
}
