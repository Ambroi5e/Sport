"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(app)/entrainement/programme/actions";
import { CheckChips } from "@/components/ui/check-chips";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DEFAULT_EQUIPMENT, MAX_PRIORITY_MUSCLES, PROGRAM_MINUTES, PROGRAM_SESSIONS, PROGRAM_WEEKS } from "@/lib/program";
import { EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/training";

const selectClass = "h-12 w-full rounded-control border border-line bg-surface-2 px-3 text-base text-text focus:border-accent focus:outline-none";

/** Réglages du programme : rythme, durée, matériel, priorités et objectif chiffré facultatif. */
export function ProgramForm({
  action,
  defaults,
  goalOptions,
  unit,
  minDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: { sessions: number };
  /** Exercices avec charge, par groupe musculaire. */
  goalOptions: { group: string; exercises: { id: string; name: string }[] }[];
  unit: string;
  minDate: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const v = state.values;
  const list = (value: string | undefined, fallback: string[]) => (value === undefined ? fallback : value.split(",").filter(Boolean));

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <ChoiceGroup
        name="sessions"
        legend="Séances par semaine"
        columns={3}
        defaultValue={v?.sessions || String(defaults.sessions)}
        options={PROGRAM_SESSIONS.map((n) => ({ value: String(n), label: String(n) }))}
      />
      <ChoiceGroup
        name="minutes"
        legend="Durée d'une séance"
        columns={3}
        defaultValue={v?.minutes || "60"}
        options={PROGRAM_MINUTES.map((n) => ({ value: String(n), label: `${n} min` }))}
      />
      <ChoiceGroup
        name="weeks"
        legend="Durée du programme"
        columns={3}
        defaultValue={v?.weeks || "12"}
        options={PROGRAM_WEEKS.map((n) => ({ value: String(n), label: `${n} semaines` }))}
      />
      <CheckChips
        name="equipment"
        legend="Matériel disponible"
        defaultValues={list(v?.equipment, DEFAULT_EQUIPMENT)}
        options={Object.entries(EQUIPMENT_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <CheckChips
        name="priority"
        legend="Muscles prioritaires (facultatif)"
        hint={`${MAX_PRIORITY_MUSCLES} au plus. Ils passent plus tôt dans la séance et reçoivent des séries en plus.`}
        defaultValues={list(v?.priority, [])}
        options={MUSCLE_GROUPS.flatMap((g) => g.muscles).map((m) => ({ value: m, label: MUSCLE_LABELS[m] }))}
      />

      <fieldset className="grid gap-4 rounded-control border border-line p-4">
        <legend className="px-1 text-sm font-medium">Objectif chiffré (facultatif)</legend>
        <p className="-mt-1 text-[13px] text-muted">Par exemple « développé couché à 100 kg en mai ». Fonte projette ton 1RM estimé vers cette charge.</p>
        <div className="grid gap-1.5">
          <label htmlFor="goalExercise" className="text-sm font-medium">
            Exercice
          </label>
          <select id="goalExercise" name="goalExercise" defaultValue={v?.goalExercise ?? ""} className={selectClass}>
            <option value="">Pas d&apos;objectif chiffré</option>
            {goalOptions.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="goalKg"
            name="goalKg"
            label="1RM visé"
            inputMode="decimal"
            autoComplete="off"
            suffix={unit}
            defaultValue={v?.goalKg ?? ""}
            hint="La charge que tu veux soulever une fois."
          />
          <Field id="goalDate" name="goalDate" type="date" label="Pour le (facultatif)" min={minDate} defaultValue={v?.goalDate ?? ""} />
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Génération…">
        Générer mon programme
      </SubmitButton>
    </form>
  );
}
