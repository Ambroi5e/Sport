"use client";

import { useActionState } from "react";
import { saveMealAsFavorite, type FormState } from "@/app/(app)/nutrition/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Meal } from "@/lib/engine";

/** Nom du repas favori : « Mon petit-déj », « Post-séance »… */
export function FavoriteForm({ meal, day, defaultName }: { meal: Meal; day: string; defaultName: string }) {
  const [state, formAction] = useActionState(saveMealAsFavorite, {} as FormState);
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="day" value={day} />
      <Field id="name" name="name" label="Nom du favori" autoComplete="off" maxLength={40} required defaultValue={state.values?.name ?? defaultName} error={state.error} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        Enregistrer en favori
      </SubmitButton>
    </form>
  );
}
