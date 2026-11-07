/**
 * File d'attente des saisies faites sans réseau : fusion et retrait des
 * opérations. Le stockage et l'envoi vivent ailleurs (lib/offline).
 */

export type OutboxEntry<P = unknown> = {
  /** Identifiant unique de cette version de l'opération. */
  id: string;
  /** Ce que l'opération modifie (une série, un exercice de séance). Deux opérations de même clé se remplacent. */
  key: string;
  /** Compte qui a fait la saisie : l'opération ne part qu'avec sa session. */
  userId: string;
  /** Regroupement pour l'affichage, par exemple l'identifiant de la séance. */
  scope: string;
  payload: P;
  /** Heure de mise en file, ISO. */
  queuedAt: string;
};

/**
 * Ajoute une opération en fin de file. Une opération déjà en attente pour la
 * même clé et le même compte est remplacée : seule la dernière version part.
 */
export function enqueue<P>(queue: OutboxEntry<P>[], entry: OutboxEntry<P>): OutboxEntry<P>[] {
  return [...queue.filter((e) => !(e.key === entry.key && e.userId === entry.userId)), entry];
}

/**
 * Retire une opération envoyée. Si elle a été remplacée entre-temps par une
 * version plus récente, celle-ci reste en file.
 */
export function settle<P>(queue: OutboxEntry<P>[], id: string): OutboxEntry<P>[] {
  return queue.filter((e) => e.id !== id);
}

/** Opérations en attente d'un compte, dans l'ordre d'envoi, éventuellement limitées à un regroupement. */
export function pendingFor<P>(queue: OutboxEntry<P>[], userId: string, scope?: string): OutboxEntry<P>[] {
  return queue.filter((e) => e.userId === userId && (scope === undefined || e.scope === scope));
}

/** Délai avant le prochain essai : 2 s, 4 s, 8 s… jusqu'à 60 s. */
export function retryDelay(failures: number): number {
  return Math.min(60_000, 2_000 * 2 ** Math.max(0, failures - 1));
}

/** Écart accepté entre l'horloge du téléphone et celle du serveur. */
const CLOCK_SKEW_MS = 5 * 60_000;
/** Une saisie plus ancienne vient d'une horloge fausse ou d'une file oubliée. */
const MAX_DELAY_MS = 7 * 86_400_000;

/**
 * Heure de validation d'une saisie faite sur le téléphone, si elle est
 * plausible (ni dans le futur, ni vieille de plus de 7 jours) ; sinon `now`.
 */
export function plausibleTime(sent: string | null, now: number): string {
  const at = sent ? Date.parse(sent) : Number.NaN;
  const ok = Number.isFinite(at) && at <= now + CLOCK_SKEW_MS && at >= now - MAX_DELAY_MS;
  return new Date(ok ? at : now).toISOString();
}
