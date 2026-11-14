"use client";

import { useActionState } from "react";
import type { GroceryState } from "@/app/(app)/courses/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldNumber, formatEuros, type MealNeed } from "@/lib/groceries";

type Action = (state: GroceryState, formData: FormData) => Promise<GroceryState>;

function Feedback({ state }: { state: GroceryState }) {
  return (
    <p role={state.error ? "alert" : "status"} className={state.error ? "text-[14px] text-danger" : "text-[14px] text-muted"}>
      {state.error ?? state.saved ?? ""}
    </p>
  );
}

/** Budget de la semaine : un montant, ou rien. */
export function BudgetForm({ budget, action }: { budget: number | null; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <Field
        id="budget"
        name="budget"
        label="Budget courses par semaine"
        suffix="€"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={state.values?.budget ?? fieldNumber(budget)}
        hint="Laisse vide pour suivre tes dépenses sans budget."
      />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary" pendingLabel="Enregistrement…">
          Enregistrer le budget
        </SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Après les courses : le montant du ticket, et c'est noté. */
export function PurchaseForm({ today, action }: { today: string; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  return (
    // Après un achat noté, le formulaire repart vide.
    <form key={state.saved ? "note" : "saisie"} action={formAction} className="grid gap-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field id="montant" name="amount" label="Montant du ticket" suffix="€" inputMode="decimal" autoComplete="off" required defaultValue={v?.amount} />
        <Field id="jour" name="day" label="Jour" type="date" max={today} defaultValue={v?.day || today} />
      </div>
      <Field id="magasin" name="store" label="Magasin (facultatif)" maxLength={40} autoComplete="off" defaultValue={v?.store} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Enregistrement…">Noter cet achat</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Prix au kilo des aliments mangés récemment : un champ par aliment, un seul bouton. */
export function PricesForm({ foods, action }: { foods: Pick<MealNeed, "foodId" | "name" | "pricePerKg">[]; action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
        {foods.map((f) => (
          <li key={f.foodId} className="flex min-h-16 items-center gap-3 px-4 py-2">
            <label htmlFor={`prix-${f.foodId}`} className="min-w-0 flex-1 text-[15px] font-medium">
              {f.name}
            </label>
            <div className="relative w-32 shrink-0">
              <input
                id={`prix-${f.foodId}`}
                name={`price.${f.foodId}`}
                defaultValue={fieldNumber(f.pricePerKg)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Prix"
                className="h-11 w-full rounded-control border border-line bg-surface-2 pr-12 pl-3 text-right text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted">€/kg</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer les prix</SubmitButton>
        <Feedback state={state} />
      </div>
      <p className="text-[13px] text-muted">
        Le prix au kilo se lit sur l&apos;étiquette en rayon. Exemple : un paquet de 500 g à 1,20 € revient à {formatEuros(2.4)} le kilo. Vide un champ pour retirer un prix.
      </p>
    </form>
  );
}
