/**
 * File d'attente des saisies, côté navigateur. Chaque saisie y est écrite
 * avant d'être envoyée : l'écran se met à jour tout de suite, et ce qui n'a
 * pas pu partir (pas de réseau, session expirée) repart plus tard, même après
 * fermeture de l'app. Stockée dans localStorage (quelques dizaines de petites
 * opérations au plus, voir docs/plans/v0.3.md).
 */
import { useSyncExternalStore } from "react";
import { enqueue, pendingFor, retryDelay, settle, type OutboxEntry } from "@/lib/engine";

export type OutboxPayload = { kind: string; data: unknown };
export type Entry = OutboxEntry<OutboxPayload>;
export type SendResult = { ok: true } | { ok: false; retry: boolean; error: string; reconnect?: boolean };
export type Notice = { text: string; reconnect: boolean };
type Sender = (data: never) => Promise<SendResult>;

export type OutboxState = {
  /** Opérations du compte connecté encore à envoyer. */
  pending: Entry[];
  /** Saisies refusées pour de bon, par clé : l'erreur s'affiche à côté. */
  rejected: Record<string, string>;
  /** Raison du dernier envoi raté qui sera retenté (session expirée…). */
  notice: Notice | null;
};

const STORAGE_KEY = "fonte:file-attente";
const EMPTY: OutboxState = { pending: [], rejected: {}, notice: null };

const senders = new Map<string, Sender>();
const listeners = new Set<() => void>();
const drainListeners = new Set<() => void>();

let queue: Entry[] = [];
let userId: string | null = null;
let rejected: Record<string, string> = {};
let notice: Notice | null = null;
let state: OutboxState = EMPTY;
let flushing: Promise<void> | null = null;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function read(): Entry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

function write() {
  try {
    if (queue.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage plein ou bloqué : la file reste en mémoire tant que la page est ouverte.
  }
}

function emit() {
  state = { pending: userId ? pendingFor(queue, userId) : [], rejected, notice };
  for (const listener of listeners) listener();
}

/** Déclare comment envoyer un type d'opération (une fonction serveur, en pratique). */
export function registerSender<D>(kind: string, send: (data: D) => Promise<SendResult>) {
  senders.set(kind, send as Sender);
}

/**
 * Démarre la file pour le compte connecté : envoie ce qui attend et réessaie
 * au retour du réseau. Peut être appelée plusieurs fois.
 */
export function startOutbox(currentUserId: string) {
  if (typeof window === "undefined") return;
  if (userId !== currentUserId || !started) {
    userId = currentUserId;
    queue = read();
    emit();
  }
  if (!started) {
    started = true;
    window.addEventListener("online", () => void flush());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void flush();
    });
    // Une autre fenêtre de l'app a modifié la file.
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        queue = read();
        emit();
      }
    });
  }
  void flush();
}

/** Met une opération en file (en remplaçant la précédente de même clé) et lance l'envoi. */
export function push(entry: { key: string; scope: string; userId: string; payload: OutboxPayload }) {
  startOutbox(entry.userId);
  const { key } = entry;
  queue = enqueue(queue, { ...entry, id: crypto.randomUUID(), queuedAt: new Date().toISOString() });
  if (key in rejected) {
    rejected = { ...rejected };
    delete rejected[key];
  }
  write();
  emit();
  void flush();
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  failures += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryDelay(failures));
}

async function drain() {
  let sent = 0;
  // `userId` peut changer pendant un envoi (startOutbox) : relu à chaque tour.
  for (;;) {
    if (!userId) return;
    const entry = pendingFor(queue, userId)[0];
    if (!entry) {
      failures = 0;
      if (notice) {
        notice = null;
        emit();
      }
      // Seulement si quelque chose vient de partir, pas à chaque retour dans l'app.
      if (sent) for (const listener of drainListeners) listener();
      return;
    }
    if (navigator.onLine === false) return scheduleRetry();

    const send = senders.get(entry.payload.kind);
    let result: SendResult;
    try {
      result = send ? await send(entry.payload.data as never) : { ok: false, retry: false, error: "Opération inconnue." };
    } catch {
      // Pas de réseau, serveur injoignable ou version de l'app changée entre-temps : on réessaiera.
      return scheduleRetry();
    }

    if (!result.ok && result.retry) {
      notice = { text: result.error, reconnect: result.reconnect === true };
      emit();
      return scheduleRetry();
    }
    queue = settle(queue, entry.id);
    sent += 1;
    if (!result.ok) rejected = { ...rejected, [entry.key]: result.error };
    failures = 0;
    notice = null;
    write();
    emit();
  }
}

/** Envoie les opérations en attente, une par une et dans l'ordre. Un seul envoi à la fois. */
export function flush(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!flushing) flushing = drain().finally(() => (flushing = null));
  return flushing;
}

/** Prévient chaque fois que la file vient de se vider après un envoi. Renvoie de quoi se désabonner. */
export function onDrained(listener: () => void): () => void {
  drainListeners.add(listener);
  return () => drainListeners.delete(listener);
}

/** Opérations encore en attente pour un regroupement (une séance) de ce compte. */
export function pendingIn(currentUserId: string, scope: string): Entry[] {
  startOutbox(currentUserId);
  return pendingFor(queue, currentUserId, scope);
}

/** Vide la file du téléphone (déconnexion). */
export function clearOutbox() {
  queue = [];
  rejected = {};
  notice = null;
  write();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** État de la file, mis à jour à chaque changement. Vide au rendu serveur. */
export function useOutbox(): OutboxState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Réseau disponible selon le navigateur (indicatif : « en ligne » ne garantit pas que le serveur répond). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
