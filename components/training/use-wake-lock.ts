"use client";

import { useEffect, useSyncExternalStore } from "react";

const noop = () => () => {};

/** Le navigateur sait-il garder l'écran allumé ? Faux au rendu serveur. */
export function useWakeLockSupported(): boolean {
  return useSyncExternalStore(
    noop,
    () => "wakeLock" in navigator,
    () => false,
  );
}

/**
 * Garde l'écran allumé tant que `enabled` est vrai. Le navigateur relâche le
 * verrou quand l'app passe en arrière-plan : on le reprend au retour.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (cancelled || document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
        else sentinel = lock;
      } catch {
        // Refusé (économie d'énergie, onglet caché) : l'écran s'éteindra normalement.
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
