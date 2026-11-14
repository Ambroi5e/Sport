"use client";

import { useActionState, useState } from "react";
import type { HyroxFormState } from "@/app/(app)/entrainement/hyrox/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addDays } from "@/lib/dates";
import { HYROX_ROUNDS, HYROX_SPLITS, HYROX_STATIONS, hyroxSummary, parseClock, type HyroxSplits } from "@/lib/engine";
import { clockInput, STATION_LABELS } from "@/lib/hyrox";
import { formatDuration } from "@/lib/sports";

export type HyroxDefaults = { date: string; seconds: number | null; splits: HyroxSplits | null };

/**
 * Noter une course Hyrox : la date, le temps total, puis les seize temps tour par
 * tour. Les chiffres se tapent au pavé numérique, les deux-points se placent seuls.
 * Seul le temps total est obligatoire.
 */
export function HyroxForm({
  action,
  defaults,
  today,
  submitLabel = "Enregistrer",
}: {
  action: (state: HyroxFormState, formData: FormData) => Promise<HyroxFormState>;
  defaults: HyroxDefaults;
  today: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {} as HyroxFormState);
  const v = state.values;
  const [total, setTotal] = useState(v?.total ?? (defaults.seconds ? formatDuration(defaults.seconds) : ""));
  const [splits, setSplits] = useState<string[]>(() =>
    Array.from({ length: HYROX_SPLITS }, (_, i) => v?.[`s${i}`] ?? (defaults.splits?.[i] ? formatDuration(defaults.splits[i]!) : "")),
  );

  const parsed = splits.map((s) => (s ? parseClock(s) : null));
  const seconds = parseClock(total);
  const summary = hyroxSummary(parsed, seconds ?? 0);
  const noted = parsed.filter((s) => s !== null).length;
  const sum = parsed.reduce<number>((acc, s) => acc + (s ?? 0), 0);

  const split = (index: number, label: string, hint: string) => (
    <Field
      id={`s${index}`}
      name={`s${index}`}
      label={label}
      hint={hint}
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="next"
      placeholder="4:35"
      value={splits[index]}
      onChange={(e) => setSplits((list) => list.map((s, i) => (i === index ? clockInput(e.target.value, 4) : s)))}
    />
  );

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" name="date" type="date" label="Date" min={addDays(today, -730)} max={today} defaultValue={v?.date ?? defaults.date} required />
        <Field
          id="total"
          name="total"
          label="Temps total"
          hint="Heures, minutes, secondes : tape 12435 pour 1:24:35."
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          placeholder="1:24:35"
          value={total}
          onChange={(e) => setTotal(clockInput(e.target.value, 6))}
          required
        />
      </div>

      <div className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold">Temps par tour</h2>
          <p className="text-[14px] text-muted">Facultatif : note ceux que tu as. Minutes et secondes, tape 435 pour 4:35.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: HYROX_ROUNDS }, (_, r) => {
            const station = STATION_LABELS[HYROX_STATIONS[r]];
            return (
              <fieldset key={r} className="grid grid-cols-2 gap-3 rounded-control border border-line bg-surface p-3">
                <legend className="label-caps px-1">Tour {r + 1}</legend>
                {split(r * 2, "Course", "1 km")}
                {split(r * 2 + 1, station.label, station.detail)}
              </fieldset>
            );
          })}
        </div>
      </div>

      <p className="text-[14px] text-muted" aria-live="polite">
        {noted === 0
          ? "Sans temps par tour, la course compte quand même dans ta semaine."
          : summary.runSeconds !== null && summary.stationSeconds !== null
            ? `Course ${formatDuration(summary.runSeconds)}, ateliers ${formatDuration(summary.stationSeconds)}${
                summary.transitionSeconds !== null && seconds ? `, transitions ${formatDuration(summary.transitionSeconds)}` : ""
              }.`
            : `${noted} temps notés sur ${HYROX_SPLITS}, ${formatDuration(sum)} au total.`}
        {seconds !== null && sum > seconds ? " Les temps notés dépassent le temps total." : ""}
      </p>

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
