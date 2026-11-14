"use client";

import { useActionState } from "react";
import type { SupplementState } from "@/app/(app)/nutrition/complements/actions";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPLEMENT_MOMENTS, type SupplementMoment } from "@/lib/engine";
import { MOMENT_LABELS } from "@/lib/supplements";

/** Un complément : son nom, sa dose telle qu'on l'écrit soi-même, son moment. */
export function SupplementForm({
  supplement,
  action,
  submitLabel,
}: {
  supplement?: { name: string; dose: string | null; moment: SupplementMoment };
  action: (state: SupplementState, formData: FormData) => Promise<SupplementState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  const moment = v?.moment ?? supplement?.moment ?? "matin";
  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <Field id="nom" name="name" label="Complément" defaultValue={v?.name ?? supplement?.name} maxLength={40} required autoComplete="off" />
      <Field
        id="dose"
        name="dose"
        label="Dose (facultatif)"
        defaultValue={v?.dose ?? supplement?.dose ?? ""}
        placeholder="Celle de ta boîte ou de ton ordonnance"
        maxLength={30}
        autoComplete="off"
      />
      <ChoiceGroup key={moment} name="moment" legend="Moment de la journée" columns={2} defaultValue={moment} options={SUPPLEMENT_MOMENTS.map((m) => ({ value: m, label: MOMENT_LABELS[m] }))} required />
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
