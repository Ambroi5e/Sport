"use client";

import { MinusIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/components/ui/cn";
import { clampRest, formatClock, REST_STEP_SECONDS, restRemaining } from "@/lib/engine";
import { getPrefs, rememberRest, restFor } from "@/lib/session-prefs";

/**
 * Chrono de repos. On garde l'heure de fin, pas un compte à rebours : il reste
 * juste après un rechargement, un changement de page ou une mise en veille.
 */
type Rest = { workoutId: string; exerciseId: string; exerciseName: string; startedAt: number; endsAt: number };

const STORAGE_KEY = "fonte:chrono";
/** Au-delà de 2 minutes de dépassement, le chrono se range tout seul. */
const OVERTIME_LIMIT_SECONDS = 120;

const listeners = new Set<() => void>();
let current: Rest | null | undefined;

function load(): Rest | null {
  if (current !== undefined) return current;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    current = raw ? (JSON.parse(raw) as Rest) : null;
  } catch {
    current = null;
  }
  return current;
}

function save(rest: Rest | null) {
  current = rest;
  try {
    if (rest) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage bloqué : le chrono vit le temps de la page.
  }
  for (const listener of listeners) listener();
}

function useRest(): Rest | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    () => null,
  );
}

// Son de fin de repos ------------------------------------------------------------

let audio: AudioContext | null = null;

/** À appeler pendant un tap : les navigateurs n'autorisent le son qu'après un geste. */
function primeAudio() {
  if (!getPrefs().sound || typeof window === "undefined" || !("AudioContext" in window)) return;
  // Safari : son « ambiant », mélangé à la musique au lieu de la couper.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "ambient";
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
}

function beep() {
  if (!audio || !getPrefs().sound) return;
  const start = audio.currentTime;
  for (const offset of [0, 0.22]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.2, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
    osc.connect(gain).connect(audio.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.18);
  }
}

// Commandes ------------------------------------------------------------------------

/** Lance le repos après une série validée, avec la durée retenue pour l'exercice. */
export function startRest(rest: { workoutId: string; exerciseId: string; exerciseName: string }) {
  primeAudio();
  const now = Date.now();
  save({ ...rest, startedAt: now, endsAt: now + restFor(rest.exerciseId) * 1000 });
}

/** Ajoute ou retire du temps, et retient la nouvelle durée pour cet exercice. */
export function adjustRest(deltaSeconds: number) {
  const rest = load();
  if (!rest) return;
  const now = Date.now();
  const duration = clampRest((rest.endsAt - rest.startedAt) / 1000 + deltaSeconds);
  const endsAt = Math.max(now, rest.startedAt + duration * 1000);
  rememberRest(rest.exerciseId, duration);
  save({ ...rest, endsAt, startedAt: endsAt - duration * 1000 });
}

/** Arrête le chrono, ou seulement s'il appartient à cette séance quand elle est donnée. */
export function stopRest(workoutId?: string) {
  const rest = load();
  if (rest && (!workoutId || rest.workoutId === workoutId)) save(null);
}

// Affichage ------------------------------------------------------------------------

/** Chrono visible sur toutes les pages : au-dessus des onglets sur mobile, en bas à droite sur ordinateur. */
export function RestTimerDock() {
  const rest = useRest();
  const [now, setNow] = useState(() => Date.now());
  const [announce, setAnnounce] = useState("");
  const signaled = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [rest]);

  const remaining = rest ? restRemaining(rest.endsAt, now) : 0;
  const over = rest !== null && remaining <= 0;

  useEffect(() => {
    if (!rest || !over || signaled.current === rest.endsAt) return;
    signaled.current = rest.endsAt;
    // Signal seulement si on arrive à la fin maintenant, pas en revenant dans l'app longtemps après.
    if (now - rest.endsAt < 3000) {
      beep();
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    }
    setAnnounce(`Repos terminé${rest.exerciseName ? ` : ${rest.exerciseName}` : ""}.`);
  }, [rest, over, now]);

  useEffect(() => {
    if (rest && -remaining > OVERTIME_LIMIT_SECONDS) stopRest();
  }, [rest, remaining]);

  const duration = rest ? (rest.endsAt - rest.startedAt) / 1000 : 1;
  const progress = rest ? Math.min(1, Math.max(0, 1 - remaining / duration)) : 0;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {rest ? (
        <section
          aria-label="Chrono de repos"
          className={cn(
            "fixed left-4 right-[88px] z-30 overflow-hidden rounded-control border bg-surface shadow-[0_6px_20px_rgb(0_0_0/0.35)] md:right-6 md:bottom-6! md:left-auto md:w-[340px]",
            over ? "border-accent-text" : "border-line",
          )}
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex h-14 items-center gap-1.5 pr-1.5 pl-3">
            <Link href={`/entrainement/seance/${rest.workoutId}`} className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12px] text-muted">
                {over ? (
                  "C'est reparti"
                ) : (
                  <>
                    Repos<span className="hidden md:inline"> · {rest.exerciseName}</span>
                  </>
                )}
              </span>
              <span role="timer" className={cn("font-numeric block text-[26px] leading-none", over ? "text-accent-text" : "text-text")}>
                {formatClock(remaining)}
              </span>
            </Link>
            {over ? null : (
              <>
                <TimerButton label={`Retirer ${REST_STEP_SECONDS} secondes`} onClick={() => adjustRest(-REST_STEP_SECONDS)}>
                  <MinusIcon size={18} weight="bold" aria-hidden="true" />
                  <span className="font-numeric text-[13px]">15</span>
                </TimerButton>
                <TimerButton label={`Ajouter ${REST_STEP_SECONDS} secondes`} onClick={() => adjustRest(REST_STEP_SECONDS)}>
                  <PlusIcon size={18} weight="bold" aria-hidden="true" />
                  <span className="font-numeric text-[13px]">15</span>
                </TimerButton>
              </>
            )}
            <TimerButton label={over ? "Fermer le chrono" : "Passer le repos"} onClick={() => stopRest()}>
              <XIcon size={18} weight="bold" aria-hidden="true" />
            </TimerButton>
          </div>
          <div className="h-1 bg-surface-2" aria-hidden="true">
            <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
          </div>
        </section>
      ) : null}
    </>
  );
}

function TimerButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-control bg-surface-2 px-2 text-text active:scale-95"
    >
      {children}
    </button>
  );
}
