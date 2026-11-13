"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { WeeklySportState } from "@/app/(app)/entrainement/semaine/actions";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { INTENSITIES, type Intensity } from "@/lib/engine";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/planning";
import { DURATION_CHOICES, formatMinutes, INTENSITY_LABELS, LABEL_MAX, SPORT_LABELS, type Sport } from "@/lib/sports";

const chip = cn(
  "flex h-full min-h-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 px-2 py-2 text-center text-[15px] font-medium",
  "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
);

function Radio({ name, value, checked, onChange, label, children }: { name: string; value: string; checked: boolean; onChange: () => void; label?: string; children: ReactNode }) {
  return (
    <label className="relative grid">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
      <span className={chip} aria-hidden={label ? "true" : undefined}>
        {children}
      </span>
    </label>
  );
}

/** Ajouter un sport fixe à la semaine type : le jour, le sport, la durée et l'intensité habituelles. */
export function WeeklySportForm({
  action,
  sports,
  defaults,
}: {
  action: (state: WeeklySportState, formData: FormData) => Promise<WeeklySportState>;
  /** Ordre d'affichage : les sports déjà notés d'abord. */
  sports: Sport[];
  defaults: { sport: Sport; minutes: number; intensity: Intensity };
}) {
  const [state, formAction] = useActionState(action, {} as WeeklySportState);
  const v = state.values;
  const [weekday, setWeekday] = useState(v?.weekday ?? "");
  const [sport, setSport] = useState<Sport>((v?.sport as Sport) ?? defaults.sport);
  const [minutes, setMinutes] = useState(v?.minutes ?? String(defaults.minutes));
  const [intensity, setIntensity] = useState<Intensity>((v?.intensity as Intensity) ?? defaults.intensity);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Jour</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_SHORT.map((short, i) => (
            <Radio key={short} name="weekday" value={String(i + 1)} checked={weekday === String(i + 1)} onChange={() => setWeekday(String(i + 1))} label={WEEKDAY_NAMES[i]}>
              {short}
            </Radio>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Sport</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sports.map((s) => (
            <Radio key={s} name="sport" value={s} checked={sport === s} onChange={() => setSport(s)}>
              {SPORT_LABELS[s]}
            </Radio>
          ))}
        </div>
      </fieldset>

      {sport === "autre" ? (
        <Field id="label" name="label" label="Nom du sport" maxLength={LABEL_MAX} autoComplete="off" defaultValue={v?.label ?? ""} placeholder="Paddle, ski, danse…" required />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Durée habituelle</legend>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_CHOICES.map((m) => (
            <label key={m} className="relative">
              <input type="radio" name="duree-rapide" checked={minutes === String(m)} onChange={() => setMinutes(String(m))} className="peer sr-only" />
              <span className={chip}>{formatMinutes(m)}</span>
            </label>
          ))}
        </div>
        <Field
          id="minutes"
          name="minutes"
          label="Ou en minutes"
          inputMode="numeric"
          autoComplete="off"
          suffix="min"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className="mt-2 max-w-40"
        />
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Intensité habituelle</legend>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((i) => (
            <Radio key={i} name="intensity" value={i} checked={intensity === i} onChange={() => setIntensity(i)}>
              {INTENSITY_LABELS[i].label}
            </Radio>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          {INTENSITY_LABELS[intensity].label} : {INTENSITY_LABELS[intensity].hint}.{" "}
          {intensity === "legere" ? "Un sport léger ne gêne aucune séance." : "Le planning évite les séances qui travaillent les mêmes muscles la veille, le jour même et le lendemain."}
        </p>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Ajout…">
        Ajouter à ma semaine type
      </SubmitButton>
    </form>
  );
}
