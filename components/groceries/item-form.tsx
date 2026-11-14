"use client";

import { useActionState } from "react";
import type { GroceryState } from "@/app/(app)/courses/actions";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AISLES } from "@/lib/engine";
import { AISLE_LABELS, type ShoppingItem } from "@/lib/groceries";

/** Un article : son nom, sa quantité en clair, son rayon. */
export function ItemForm({ item, action }: { item: ShoppingItem; action: (state: GroceryState, formData: FormData) => Promise<GroceryState> }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values;
  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <Field id="nom" name="name" label="Article" defaultValue={v?.name ?? item.name} maxLength={60} required autoComplete="off" />
      <Field
        id="quantite"
        name="quantity"
        label="Quantité (facultatif)"
        defaultValue={v?.quantity ?? item.quantity ?? ""}
        placeholder="900 g, 2 paquets, 6…"
        maxLength={30}
        autoComplete="off"
        hint={item.grams !== null ? "Si tu la changes, le coût estimé de cet article n'est plus calculé." : undefined}
      />
      <ChoiceGroup
        // Un refus renvoie le rayon choisi : la clé le réapplique.
        key={v?.aisle ?? item.aisle}
        name="aisle"
        legend="Rayon"
        columns={2}
        defaultValue={v?.aisle ?? item.aisle}
        options={AISLES.map((a) => ({ value: a, label: AISLE_LABELS[a] }))}
        required
      />
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
