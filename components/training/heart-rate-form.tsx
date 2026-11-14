"use client";

import { useActionState } from "react";
import type { HeartRateFormState } from "@/app/(app)/entrainement/endurance/zones/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Fréquence maximale et de repos : deux nombres, tous deux facultatifs. */
export function HeartRateForm({
  action,
  hrMax,
  hrRest,
  estimate,
}: {
  action: (state: HeartRateFormState, formData: FormData) => Promise<HeartRateFormState>;
  hrMax: number | null;
  hrRest: number | null;
  /** Estimation par l'âge, proposée tant que rien n'est noté. */
  estimate: number | null;
}) {
  const [state, formAction] = useActionState(action, {} as HeartRateFormState);
  const v = state.values;
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id="hr-max"
          name="max"
          label="Fréquence maximale"
          hint={estimate ? `Vide : estimée à ${estimate} d'après ton âge.` : "La plus haute que tu aies vue à l'effort."}
          inputMode="numeric"
          autoComplete="off"
          suffix="bpm"
          maxLength={3}
          defaultValue={v?.max ?? hrMax ?? ""}
        />
        <Field
          id="hr-rest"
          name="rest"
          label="Fréquence de repos"
          hint="Au réveil, allongé. Facultatif."
          inputMode="numeric"
          autoComplete="off"
          suffix="bpm"
          maxLength={3}
          defaultValue={v?.rest ?? hrRest ?? ""}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : state.saved ? (
        <p role="status" className="text-[14px] text-muted">
          Enregistré.
        </p>
      ) : null}
      <SubmitButton size="lg" variant="secondary" className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
