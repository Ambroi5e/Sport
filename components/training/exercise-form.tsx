"use client";

import { useActionState } from "react";
import { createExercise, type FormState } from "@/app/(app)/entrainement/actions";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EQUIPMENT_LABELS, MEASURE_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS } from "@/lib/training";

const selectClass =
  "h-12 w-full rounded-control border border-line bg-surface-2 px-3 text-base text-text focus:border-accent focus:outline-none";

/** Création d'un exercice personnel : nom, muscle principal, secondaires, matériel, mesure. */
export function ExerciseForm({ retour }: { retour?: string }) {
  const [state, action] = useActionState(createExercise, {} as FormState);

  return (
    <form action={action} className="grid gap-5" noValidate>
      {retour ? <input type="hidden" name="retour" value={retour} /> : null}
      <Field id="name" name="name" label="Nom" autoComplete="off" maxLength={60} required />

      <div className="grid gap-1.5">
        <label htmlFor="primary" className="text-sm font-medium">
          Muscle principal
        </label>
        <select id="primary" name="primary" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Choisir
          </option>
          {MUSCLE_GROUPS.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {g.muscles.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Muscles secondaires (facultatif)</legend>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.flatMap((g) => g.muscles).map((m) => (
            <label key={m}>
              <input type="checkbox" name="secondary" value={m} className="peer sr-only" />
              <span className="flex h-10 cursor-pointer items-center rounded-full border border-line bg-surface-2 px-3.5 text-sm font-medium text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text">
                {MUSCLE_LABELS[m]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ChoiceGroup
        name="equipment"
        legend="Matériel"
        columns={4}
        defaultValue="halteres"
        options={Object.entries(EQUIPMENT_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <ChoiceGroup
        name="measure"
        legend="Ce qu'on note"
        columns={3}
        defaultValue="charge"
        options={Object.entries(MEASURE_LABELS).map(([value, label]) => ({ value, label }))}
      />

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" pendingLabel="Création…">
        Créer l&apos;exercice
      </SubmitButton>
    </form>
  );
}
