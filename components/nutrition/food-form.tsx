"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(app)/nutrition/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Food } from "@/lib/nutrition";

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, useGrouping: false });
const show = (n: number | null | undefined) => (n === null || n === undefined ? "" : numberFormat.format(n));

/** Aliment personnel : valeurs pour 100 g lues sur l'étiquette, portion facultative. */
export function FoodForm({
  action,
  food,
  defaultName,
  hidden = {},
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  food?: Food;
  defaultName?: string;
  hidden?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const decimal = { inputMode: "decimal" as const, autoComplete: "off", enterKeyHint: "next" as const };
  // Saisie refusée : on la remet telle quelle plutôt que de vider le formulaire.
  const v = (key: string, fallback: string) => state.values?.[key] ?? fallback;

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Field id="name" name="name" label="Nom" autoComplete="off" maxLength={80} required defaultValue={v("name", food?.name ?? defaultName ?? "")} />
      <Field id="brand" name="brand" label="Marque (facultatif)" autoComplete="off" maxLength={60} defaultValue={v("brand", food?.brand ?? "")} />

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          Pour 100 g <span className="font-normal text-muted">(sur l&apos;étiquette, colonne « pour 100 g »)</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Field id="kcal" name="kcal" label="Calories" suffix="kcal" required defaultValue={v("kcal", show(food?.per100.kcal))} {...decimal} />
          <Field id="proteinG" name="proteinG" label="Protéines" suffix="g" required defaultValue={v("proteinG", show(food?.per100.proteinG))} {...decimal} />
          <Field id="carbsG" name="carbsG" label="Glucides" suffix="g" required defaultValue={v("carbsG", show(food?.per100.carbsG))} {...decimal} />
          <Field id="fatG" name="fatG" label="Lipides" suffix="g" required defaultValue={v("fatG", show(food?.per100.fatG))} {...decimal} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          Portion <span className="font-normal text-muted">(facultatif)</span>
        </legend>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <Field id="portionLabel" name="portionLabel" label="Nom" placeholder="1 pot" autoComplete="off" maxLength={40} defaultValue={v("portionLabel", food?.portionLabel ?? "")} />
          <Field id="portionG" name="portionG" label="Poids" suffix="g" defaultValue={v("portionG", show(food?.portionG))} {...decimal} />
        </div>
      </fieldset>

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
