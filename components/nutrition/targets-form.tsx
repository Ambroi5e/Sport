"use client";

import { useActionState, useState } from "react";
import { saveTargets, type FormState } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DayType, TargetSuggestion } from "@/lib/engine";
import { DAY_TYPE_LABELS, formatKcal, WEEKDAYS, type Target } from "@/lib/nutrition";

type Values = Record<DayType, { kcal: string; proteinG: string; carbsG: string; fatG: string }>;
const DAY_TYPES: DayType[] = ["entrainement", "repos"];
const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/**
 * Jours habituels d'entraînement et cibles des deux types de jour. Le repère
 * suggéré se recopie en un tap, puis reste modifiable : il n'est jamais imposé.
 */
export function TargetsForm({
  current,
  trainingDays,
  suggestion,
}: {
  current: Partial<Record<DayType, Target>>;
  trainingDays: readonly number[];
  suggestion: TargetSuggestion | null;
}) {
  const [state, formAction] = useActionState(saveTargets, {} as FormState);
  const [values, setValues] = useState<Values>(() => ({
    entrainement: {
      kcal: text(current.entrainement?.kcal),
      proteinG: text(current.entrainement?.proteinG),
      carbsG: text(current.entrainement?.carbsG),
      fatG: text(current.entrainement?.fatG),
    },
    repos: { kcal: text(current.repos?.kcal), proteinG: text(current.repos?.proteinG), carbsG: text(current.repos?.carbsG), fatG: text(current.repos?.fatG) },
  }));
  const [days, setDays] = useState<number[]>([...trainingDays]);

  const set = (dayType: DayType, key: keyof Values[DayType], value: string) =>
    setValues((v) => ({ ...v, [dayType]: { ...v[dayType], [key]: value } }));

  function applySuggestion() {
    if (!suggestion) return;
    setValues((v) => ({
      entrainement: { ...v.entrainement, kcal: String(suggestion.entrainement.kcal), proteinG: String(suggestion.entrainement.proteinG) },
      repos: { ...v.repos, kcal: String(suggestion.repos.kcal), proteinG: String(suggestion.repos.proteinG) },
    }));
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {suggestion ? (
        <div className="grid gap-3 rounded-control border border-line bg-surface-2 p-4">
          <p className="label-caps">Repère suggéré</p>
          <dl className="grid grid-cols-2 gap-3">
            {DAY_TYPES.map((t) => (
              <div key={t} className="grid gap-0.5">
                <dt className="text-[13px] text-muted">{t === "entrainement" ? "Entraînement" : "Repos"}</dt>
                <dd>
                  <span className="font-numeric text-[24px]">{formatKcal(suggestion[t].kcal)}</span> <span className="text-[14px] text-muted">kcal</span>
                  <span className="block text-[14px] text-muted">{suggestion[t].proteinG} g de protéines</span>
                </dd>
              </div>
            ))}
          </dl>
          <Button variant="secondary" onClick={applySuggestion}>
            Utiliser ce repère
          </Button>
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Jours habituels d&apos;entraînement</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <label key={d.n}>
              <input
                type="checkbox"
                name="trainingDays"
                value={d.n}
                checked={days.includes(d.n)}
                onChange={(e) => setDays((all) => (e.target.checked ? [...all, d.n] : all.filter((n) => n !== d.n)))}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 text-[14px] font-medium text-muted transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text"
              >
                {d.short}
              </span>
              <span className="sr-only">{d.label}</span>
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted">Un jour où tu enregistres une séance compte aussi comme jour d&apos;entraînement.</p>
      </fieldset>

      {DAY_TYPES.map((t) => (
        <fieldset key={t} className="grid gap-3">
          <legend className="mb-1 text-base font-semibold">{DAY_TYPE_LABELS[t]}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`${t}-kcal`} name={`${t}.kcal`} label="Calories" suffix="kcal" inputMode="numeric" autoComplete="off" required value={values[t].kcal} onChange={(e) => set(t, "kcal", e.target.value)} />
            <Field id={`${t}-proteinG`} name={`${t}.proteinG`} label="Protéines" suffix="g" inputMode="numeric" autoComplete="off" required value={values[t].proteinG} onChange={(e) => set(t, "proteinG", e.target.value)} />
            <Field id={`${t}-carbsG`} name={`${t}.carbsG`} label="Glucides (facultatif)" suffix="g" inputMode="numeric" autoComplete="off" value={values[t].carbsG} onChange={(e) => set(t, "carbsG", e.target.value)} />
            <Field id={`${t}-fatG`} name={`${t}.fatG`} label="Lipides (facultatif)" suffix="g" inputMode="numeric" autoComplete="off" value={values[t].fatG} onChange={(e) => set(t, "fatG", e.target.value)} />
          </div>
        </fieldset>
      ))}

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
