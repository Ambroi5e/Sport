/**
 * Réglages de séance, propres à l'appareil : repos par défaut, son de fin de
 * repos, écran gardé allumé, et durée de repos retenue pour chaque exercice.
 */
import { useSyncExternalStore } from "react";
import { clampRest, REST_DEFAULT_SECONDS } from "@/lib/engine";

export type SessionPrefs = { restSeconds: number; sound: boolean; keepAwake: boolean };

const PREFS_KEY = "fonte:seance-reglages";
const REST_KEY = "fonte:repos-exercices";
export const DEFAULT_PREFS: SessionPrefs = { restSeconds: REST_DEFAULT_SECONDS, sound: true, keepAwake: true };

const listeners = new Set<() => void>();
let prefs: SessionPrefs | null = null;

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage bloqué : le réglage vaut pour cette page seulement.
  }
}

export function getPrefs(): SessionPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  if (!prefs) {
    const stored = readJson(PREFS_KEY) as Partial<SessionPrefs> | null;
    prefs = {
      restSeconds: clampRest(stored?.restSeconds ?? DEFAULT_PREFS.restSeconds),
      sound: stored?.sound ?? DEFAULT_PREFS.sound,
      keepAwake: stored?.keepAwake ?? DEFAULT_PREFS.keepAwake,
    };
  }
  return prefs;
}

export function setPrefs(patch: Partial<SessionPrefs>) {
  prefs = { ...getPrefs(), ...patch };
  writeJson(PREFS_KEY, prefs);
  for (const listener of listeners) listener();
}

export function usePrefs(): SessionPrefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getPrefs,
    () => DEFAULT_PREFS,
  );
}

/** Repos retenu pour cet exercice, sinon le repos par défaut. */
export function restFor(exerciseId: string): number {
  const map = readJson(REST_KEY) as Record<string, number> | null;
  const seconds = map?.[exerciseId];
  return typeof seconds === "number" ? clampRest(seconds) : getPrefs().restSeconds;
}

export function rememberRest(exerciseId: string, seconds: number) {
  const map = (readJson(REST_KEY) as Record<string, number> | null) ?? {};
  writeJson(REST_KEY, { ...map, [exerciseId]: clampRest(seconds) });
}

/** Efface du téléphone tout ce que l'app y a gardé (déconnexion). */
export function clearDeviceData() {
  prefs = null;
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith("fonte:")) window.localStorage.removeItem(key);
  } catch {
    // Rien à effacer.
  }
  for (const listener of listeners) listener();
}
