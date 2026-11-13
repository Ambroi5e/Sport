/** Séance commune : le résumé de chaque participant à partir du fil des séries. Pur. */

export type GroupPerson = { userId: string; name: string; joinedAt: string | null; isOwner: boolean };

export type GroupEvent = {
  id: string;
  userId: string;
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  /** Horodatage ISO. */
  at: string;
};

export type GroupRow = GroupPerson & {
  /** Séries terminées pendant la séance commune. */
  sets: number;
  /** Kilos soulevés (charge × répétitions). */
  volumeKg: number;
  /** Exercices différents, dans l'ordre où ils ont commencé. */
  exercises: string[];
  /** Dernière série, ou null tant que rien n'est fait. */
  last: GroupEvent | null;
  /** Numéro de la dernière série dans son exercice (« série 3 »). */
  lastSetNumber: number;
};

/** Séance commune encore ouverte : pas terminée, et lancée depuis moins de `hours` heures. */
export const GROUP_SESSION_HOURS = 6;

export function isGroupLive(session: { createdAt: string; endedAt: string | null }, now: number): boolean {
  return session.endedAt === null && now - Date.parse(session.createdAt) < GROUP_SESSION_HOURS * 3_600_000;
}

/**
 * Une ligne par participant, dans l'ordre reçu (celui qui a lancé d'abord), avec
 * ses séries, son volume et sa dernière série. Les événements de quelqu'un qui a
 * quitté la séance ne sont rattachés à personne.
 */
export function groupBoard(people: readonly GroupPerson[], events: readonly GroupEvent[]): GroupRow[] {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return people.map((person) => {
    const mine = ordered.filter((e) => e.userId === person.userId);
    const last = mine.at(-1) ?? null;
    return {
      ...person,
      sets: mine.length,
      volumeKg: mine.reduce((sum, e) => sum + (e.weightKg ?? 0) * (e.reps ?? 0), 0),
      exercises: [...new Set(mine.map((e) => e.exercise))],
      last,
      lastSetNumber: last ? mine.filter((e) => e.exercise === last.exercise).length : 0,
    };
  });
}

/** Les dernières séries, la plus récente d'abord. */
export function groupFeed(events: readonly GroupEvent[], limit = 20): GroupEvent[] {
  return [...events].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)).slice(0, limit);
}
