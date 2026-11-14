/**
 * Hyrox : huit tours d'une course de 1 km suivie d'un atelier. Les seize temps
 * d'une course sont rangés dans l'ordre de l'épreuve : course 1, atelier 1, …
 * course 8, atelier 8. Un temps non noté est `null`.
 */

export const HYROX_STATIONS = ["skierg", "sled_push", "sled_pull", "burpees", "rameur", "farmers", "fentes", "wall_balls"] as const;
export type HyroxStation = (typeof HYROX_STATIONS)[number];

export const HYROX_ROUNDS = HYROX_STATIONS.length;
export const HYROX_SPLITS = HYROX_ROUNDS * 2;

export type HyroxSplits = readonly (number | null)[];

/** Une course Hyrox : `seconds` est le temps total, `splits` ses seize temps (ou `null` sans détail). */
export type HyroxRace = { id: string; date: string; seconds: number; splits: HyroxSplits | null };

/** Segment à la position `index` (0 à 15) : la course du tour, ou son atelier. */
export function hyroxSegment(index: number): { round: number; station: HyroxStation | null } {
  const round = Math.floor(index / 2) + 1;
  return { round, station: index % 2 ? HYROX_STATIONS[round - 1] : null };
}

/** Seize temps, toujours : complète ou tronque ce qui vient de la base. */
export function normalizeSplits(splits: readonly (number | null)[] | null | undefined): (number | null)[] | null {
  if (!splits || splits.every((s) => s === null)) return null;
  return Array.from({ length: HYROX_SPLITS }, (_, i) => splits[i] ?? null);
}

const runsOf = (splits: HyroxSplits) => splits.filter((_, i) => i % 2 === 0);
const stationsOf = (splits: HyroxSplits) => splits.filter((_, i) => i % 2 === 1);
const total = (values: readonly (number | null)[]) => (values.length && values.every((v) => v !== null) ? values.reduce<number>((sum, v) => sum + v!, 0) : null);

export type HyroxSummary = {
  /** Somme des huit courses, des huit ateliers : `null` s'il en manque un. */
  runSeconds: number | null;
  stationSeconds: number | null;
  /** Temps total moins les seize segments : `null` s'il en manque un ou si la somme dépasse le total. */
  transitionSeconds: number | null;
  /** Moyenne des quatre dernières courses moins celle des quatre premières, en secondes par kilomètre. */
  runFade: number | null;
};

export function hyroxSummary(splits: HyroxSplits | null, seconds: number): HyroxSummary {
  if (!splits) return { runSeconds: null, stationSeconds: null, transitionSeconds: null, runFade: null };
  const runs = runsOf(splits);
  const runSeconds = total(runs);
  const stationSeconds = total(stationsOf(splits));
  const rest = runSeconds !== null && stationSeconds !== null ? seconds - runSeconds - stationSeconds : null;
  const first = total(runs.slice(0, HYROX_ROUNDS / 2));
  const last = total(runs.slice(HYROX_ROUNDS / 2));
  return {
    runSeconds,
    stationSeconds,
    transitionSeconds: rest !== null && rest >= 0 ? rest : null,
    runFade: first !== null && last !== null ? Math.round((last - first) / (HYROX_ROUNDS / 2)) : null,
  };
}

/** Écart de chaque segment avec une course précédente (négatif : plus rapide) ; `null` si l'un des deux manque. */
export function hyroxDeltas(current: HyroxSplits | null, previous: HyroxSplits | null): (number | null)[] {
  return Array.from({ length: HYROX_SPLITS }, (_, i) => {
    const a = current?.[i] ?? null;
    const b = previous?.[i] ?? null;
    return a !== null && b !== null ? a - b : null;
  });
}

export type HyroxBest = { seconds: number; raceId: string; date: string };

/**
 * Meilleur temps de chaque segment sur toutes les courses (la plus ancienne gagne
 * à égalité), et leur somme quand les seize sont connus : le temps « idéal », sans transitions.
 */
export function hyroxBests(races: readonly HyroxRace[]): { bests: (HyroxBest | null)[]; idealSeconds: number | null } {
  const byDate = [...races].sort((a, b) => a.date.localeCompare(b.date));
  const bests = Array.from({ length: HYROX_SPLITS }, (_, i) => {
    let best: HyroxBest | null = null;
    for (const race of byDate) {
      const s = race.splits?.[i] ?? null;
      if (s !== null && (!best || s < best.seconds)) best = { seconds: s, raceId: race.id, date: race.date };
    }
    return best;
  });
  return { bests, idealSeconds: total(bests.map((b) => b?.seconds ?? null)) };
}

/** « 4:35 », « 1:24:35 » ou un nombre de secondes vers des secondes ; `null` si ce n'est pas un temps. */
export function parseClock(value: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (m[1] !== undefined && min > 59) return null;
  return h * 3600 + min * 60 + s;
}
