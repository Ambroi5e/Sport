"use client";

import { useActionState } from "react";
import type { GroceryState } from "@/app/(app)/courses/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { StockItem } from "@/lib/groceries";

type Action = (state: GroceryState, formData: FormData) => Promise<GroceryState>;

/** Ajouter au stock ce qu'on a déjà : un nom, une date si l'emballage en porte une. */
export function AddStockForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    // Après un ajout, le formulaire repart vide.
    <form key={state.saved ?? "saisie"} action={formAction} className="grid gap-3" noValidate>
      <Field id="stock-nom" name="name" label="Article" placeholder="Riz, thon en boîte…" maxLength={60} required autoComplete="off" defaultValue={state.values?.name} />
      <Field id="stock-date" name="expires" label="Date de péremption (facultatif)" type="date" defaultValue={state.values?.expires} />
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Ajout…">
        Ajouter au stock
      </SubmitButton>
      <p aria-live="polite" className="sr-only">
        {state.saved ? `${state.saved} ajouté au stock.` : ""}
      </p>
    </form>
  );
}

export function StockItemForm({ item, action }: { item: StockItem; action: Action }) {
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
        placeholder="500 g, 2 boîtes…"
        maxLength={30}
        autoComplete="off"
        hint={item.grams !== null ? "Si tu la changes, cet article n'est plus déduit de « Depuis mes repas »." : undefined}
      />
      <Field id="date" name="expires" label="Date de péremption (facultatif)" type="date" defaultValue={v?.expires ?? item.expiresOn ?? ""} />
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
