"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { ActivityFormState } from "@/app/(app)/entrainement/sports/actions";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { addDays } from "@/lib/dates";
import { activityKcal, activityMet, INTENSITIES, isEndurance, paceOf, type Intensity } from "@/lib/engine";
import {
  distanceInput,
  distanceUnit,
  DURATION_CHOICES,
  formatDuration,
  formatKcal,
  formatPace,
  hasElevation,
  INTENSITY_LABELS,
  LABEL_MAX,
  MAX_DURATION,
  MIN_DURATION,
  formatMinutes,
  parseDistance,
  SPORT_LABELS,
  type Sport,
} from "@/lib/sports";

export type ActivityDefaults = {
  sport: Sport;
  label: string;
  minutes: number;
  intensity: Intensity;
  date: string;
  /** Sortie d'endurance : distance, secondes au-delà des minutes, dénivelé, fréquence cardiaque moyenne. */
  distanceM?: number | null;
  extraSeconds?: number;
  elevationM?: number | null;
  avgHr?: number | null;
};

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

const chip = cn(
  "flex min-h-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 px-3 py-2 text-center text-[15px] font-medium",
  "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
);

function Radio({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="relative grid">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={cn(chip, "h-full")}>{children}</span>
    </label>
  );
}

/**
 * Noter un sport : tout est prérempli avec la dernière activité, il reste à
 * enregistrer. La dépense estimée se met à jour à chaque choix, avec son calcul.
 */
export function ActivityForm({
  action,
  defaults,
  sports,
  today,
  weightKg,
  submitLabel = "Enregistrer",
}: {
  action: (state: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  defaults: ActivityDefaults;
  /** Ordre d'affichage : les sports déjà notés d'abord. */
  sports: Sport[];
  today: string;
  /** Poids retenu pour la dépense, `null` sans pesée. */
  weightKg: number | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {} as ActivityFormState);
  const v = state.values;
  const [sport, setSport] = useState<Sport>((v?.sport as Sport) ?? defaults.sport);
  const [minutes, setMinutes] = useState(v?.minutes ?? String(defaults.minutes));
  const [intensity, setIntensity] = useState<Intensity>((v?.intensity as Intensity) ?? defaults.intensity);
  const yesterday = addDays(today, -1);
  const initialDate = v?.date ?? defaults.date;
  const [when, setWhen] = useState<"today" | "yesterday" | "other">(initialDate === today ? "today" : initialDate === yesterday ? "yesterday" : "other");
  const [otherDate, setOtherDate] = useState(initialDate);
  const date = when === "today" ? today : when === "yesterday" ? yesterday : otherDate;

  const [distance, setDistance] = useState(v?.distance ?? distanceInput(defaults.distanceM ?? null, defaults.sport));
  const [extra, setExtra] = useState(v?.seconds ?? (defaults.extraSeconds ? String(defaults.extraSeconds) : ""));
  const endurance = isEndurance(sport);

  const duration = Number(minutes);
  const valid = Number.isInteger(duration) && duration >= MIN_DURATION && duration <= MAX_DURATION;
  const seconds = duration * 60 + (endurance && Number(extra) <= 59 ? Number(extra) : 0);
  const distanceM = endurance ? parseDistance(distance, sport) : null;
  const pace = endurance && valid ? paceOf(sport, distanceM, seconds) : null;
  const met = activityMet(sport, intensity, distanceM, valid ? seconds : null);
  const kcal = valid && weightKg !== null ? activityKcal(met, weightKg, seconds / 60) : null;
  const weight = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(weightKg ?? 0);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
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
        <Field
          id="label"
          name="label"
          label="Nom du sport"
          maxLength={LABEL_MAX}
          autoComplete="off"
          enterKeyHint="next"
          defaultValue={v?.label ?? defaults.label}
          placeholder="Paddle, ski, danse…"
          required
        />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Quand</legend>
        <div className="grid grid-cols-3 gap-2">
          <Radio name="when" value="today" checked={when === "today"} onChange={() => setWhen("today")}>
            Aujourd&apos;hui
          </Radio>
          <Radio name="when" value="yesterday" checked={when === "yesterday"} onChange={() => setWhen("yesterday")}>
            Hier
          </Radio>
          <Radio name="when" value="other" checked={when === "other"} onChange={() => setWhen("other")}>
            Autre jour
          </Radio>
        </div>
        {when === "other" ? (
          <Field
            id="date-autre"
            label="Date"
            type="date"
            value={otherDate}
            max={today}
            min={addDays(today, -730)}
            onChange={(e) => setOtherDate(e.target.value)}
            className="mt-2 max-w-60"
          />
        ) : null}
        <input type="hidden" name="date" value={date} />
      </fieldset>

      {endurance ? (
        <Field
          id="distance"
          name="distance"
          label="Distance"
          hint="Facultative : sans elle, pas d'allure."
          inputMode={distanceUnit(sport) === "m" ? "numeric" : "decimal"}
          autoComplete="off"
          suffix={distanceUnit(sport)}
          value={distance}
          onChange={(e) => setDistance(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
          className="max-w-40"
        />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Durée</legend>
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
          onChange={(e) => setMinutes(digits(e.target.value, 3))}
          className="mt-2 max-w-40"
        />
        {endurance ? (
          <Field
            id="seconds"
            name="seconds"
            label="Et en secondes"
            inputMode="numeric"
            autoComplete="off"
            suffix="s"
            placeholder="0"
            value={extra}
            onChange={(e) => setExtra(digits(e.target.value, 2))}
            className="max-w-40"
          />
        ) : null}
        {pace ? (
          <p className="text-[14px] text-muted" aria-live="polite">
            {formatDuration(seconds)}, soit <span className="font-numeric text-[17px] text-text">{formatPace(pace)}</span>
          </p>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Intensité</legend>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((i) => (
            <Radio key={i} name="intensity" value={i} checked={intensity === i} onChange={() => setIntensity(i)}>
              {INTENSITY_LABELS[i].label}
            </Radio>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          {INTENSITY_LABELS[intensity].label} : {INTENSITY_LABELS[intensity].hint}.
        </p>
      </fieldset>

      {endurance ? (
        <details className="group" open={Boolean(v?.elevation || v?.hr || defaults.elevationM || defaults.avgHr)}>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] font-medium text-accent-text underline-offset-4 hover:underline">
            Plus de détails
          </summary>
          <div className="mt-2 flex flex-wrap gap-4">
            {hasElevation(sport) ? (
              <Field
                id="elevation"
                name="elevation"
                label="Dénivelé positif"
                inputMode="numeric"
                autoComplete="off"
                suffix="m"
                defaultValue={v?.elevation ?? defaults.elevationM ?? ""}
                className="w-40"
              />
            ) : null}
            <Field
              id="hr"
              name="hr"
              label="Fréquence cardiaque moyenne"
              inputMode="numeric"
              autoComplete="off"
              suffix="bpm"
              defaultValue={v?.hr ?? defaults.avgHr ?? ""}
              className="w-56"
            />
          </div>
        </details>
      ) : null}

      <p className="text-[14px] text-muted" aria-live="polite">
        {kcal !== null ? (
          <>
            Dépense estimée : <span className="font-medium text-text">{formatKcal(kcal)}</span> (MET {String(met).replace(".", ",")} × {weight} kg ×{" "}
            {endurance && Number(extra) > 0 ? formatDuration(seconds) : formatMinutes(duration)}).
          </>
        ) : weightKg === null ? (
          "Pèse-toi une fois pour voir la dépense estimée."
        ) : null}
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
