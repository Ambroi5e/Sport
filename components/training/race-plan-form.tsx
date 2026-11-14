"use client";

import { useActionState, useState } from "react";
import type { RacePlanFormState } from "@/app/(app)/entrainement/endurance/objectifs/actions";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addDays } from "@/lib/dates";
import { paceOf, parseClock } from "@/lib/engine";
import { clockInput } from "@/lib/hyrox";
import { RACE_DAYS_AHEAD, RACE_DAYS_BACK, RACE_NAME_MAX, RACE_PRESETS } from "@/lib/races";
import { distanceInput, formatDuration, formatPace, parseDistance } from "@/lib/sports";

export type RacePlanDefaults = { name: string; date: string; distanceM: number | null; targetSeconds: number | null };

const chip = cn(
  "flex min-h-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 px-3 py-2 text-center text-[15px] font-medium",
  "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
);

/** Poser une course : son nom, sa date, sa distance, et le temps visé si on en a un. */
export function RacePlanForm({
  action,
  defaults,
  today,
  submitLabel = "Enregistrer",
}: {
  action: (state: RacePlanFormState, formData: FormData) => Promise<RacePlanFormState>;
  defaults: RacePlanDefaults;
  today: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {} as RacePlanFormState);
  const v = state.values;
  const isPreset = (m: number | null) => RACE_PRESETS.some((p) => p.meters === m);
  const [distance, setDistance] = useState(v?.distance ?? (defaults.distanceM === null ? "10000" : isPreset(defaults.distanceM) ? String(defaults.distanceM) : "autre"));
  const [km, setKm] = useState(v?.km ?? (defaults.distanceM !== null && !isPreset(defaults.distanceM) ? distanceInput(defaults.distanceM, "course") : ""));
  const [target, setTarget] = useState(v?.target ?? (defaults.targetSeconds ? formatDuration(defaults.targetSeconds) : ""));

  const meters = distance === "autre" ? parseDistance(km, "course") : Number(distance);
  const seconds = target ? parseClock(target) : null;
  const pace = meters && seconds ? paceOf("course", meters, seconds) : null;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <Field
        id="name"
        name="name"
        label="Nom de la course"
        maxLength={RACE_NAME_MAX}
        autoComplete="off"
        enterKeyHint="next"
        placeholder="Semi de Paris, 10 km du quartier…"
        defaultValue={v?.name ?? defaults.name}
        required
      />
      <Field
        id="date"
        name="date"
        type="date"
        label="Date"
        min={addDays(today, -RACE_DAYS_BACK)}
        max={addDays(today, RACE_DAYS_AHEAD)}
        defaultValue={v?.date ?? defaults.date}
        className="sm:w-56"
        required
      />

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Distance</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[...RACE_PRESETS.map((p) => ({ value: String(p.meters), label: p.label })), { value: "autre", label: "Autre" }].map((o) => (
            <label key={o.value} className="relative grid">
              <input type="radio" name="distance" value={o.value} checked={distance === o.value} onChange={() => setDistance(o.value)} className="peer sr-only" />
              <span className={cn(chip, "h-full")}>{o.label}</span>
            </label>
          ))}
        </div>
        {distance === "autre" ? (
          <Field
            id="km"
            name="km"
            label="Distance en kilomètres"
            inputMode="decimal"
            autoComplete="off"
            suffix="km"
            value={km}
            onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
            className="mt-2 w-56"
          />
        ) : null}
      </fieldset>

      <Field
        id="target"
        name="target"
        label="Temps visé (facultatif)"
        hint={pace ? `Soit ${formatPace(pace)} en moyenne.` : "Tape 4930 pour 49:30, 14500 pour 1:45:00."}
        inputMode="numeric"
        autoComplete="off"
        placeholder="1:45:00"
        value={target}
        onChange={(e) => setTarget(clockInput(e.target.value, 6))}
        className="sm:w-56"
      />

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
