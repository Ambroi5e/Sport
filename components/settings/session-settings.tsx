"use client";

import { useId } from "react";
import { cn } from "@/components/ui/cn";
import { useWakeLockSupported } from "@/components/training/use-wake-lock";
import { formatClock, REST_PRESETS } from "@/lib/engine";
import { setPrefs, usePrefs } from "@/lib/session-prefs";

/** Réglages de séance, gardés sur ce téléphone. */
export function SessionSettings() {
  const prefs = usePrefs();
  const wakeLockSupported = useWakeLockSupported();

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p id="repos-defaut" className="text-sm font-medium">
          Repos par défaut
        </p>
        <div role="group" aria-labelledby="repos-defaut" className="flex rounded-control border border-line bg-surface-2 p-1">
          {REST_PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => setPrefs({ restSeconds: seconds })}
              aria-pressed={prefs.restSeconds === seconds}
              className={cn(
                "font-numeric h-10 flex-1 rounded-inner px-2 text-[15px]",
                prefs.restSeconds === seconds ? "bg-accent text-on-accent" : "text-muted",
              )}
            >
              {formatClock(seconds)}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted">Le chrono démarre à chaque série validée. Règle-le pendant la séance : il retient ta durée pour chaque exercice.</p>
      </div>
      <Toggle label="Son à la fin du repos" hint="Court et discret, sans couper ta musique quand le téléphone le permet." checked={prefs.sound} onChange={(sound) => setPrefs({ sound })} />
      {wakeLockSupported ? (
        <Toggle label="Écran allumé pendant la séance" hint="Plus besoin de déverrouiller entre deux séries." checked={prefs.keepAwake} onChange={(keepAwake) => setPrefs({ keepAwake })} />
      ) : null}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  const hintId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={hintId}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 items-center gap-3 text-left"
    >
      <span className="min-w-0 flex-1" aria-hidden="true">
        <span className="block text-[15px] font-medium">{label}</span>
        <span id={hintId} className="block text-[13px] text-muted">
          {hint}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-[120ms]", checked ? "border-accent bg-accent" : "border-line bg-surface-2")}
      >
        <span
          className={cn(
            "absolute top-0.5 size-[22px] rounded-full transition-[left] duration-[120ms]",
            checked ? "left-[22px] bg-on-accent" : "left-0.5 bg-muted",
          )}
        />
      </span>
    </button>
  );
}
