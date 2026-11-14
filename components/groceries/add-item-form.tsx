"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useActionState } from "react";
import type { GroceryState } from "@/app/(app)/courses/actions";
import { SubmitButton } from "@/components/ui/submit-button";

/** Ajout rapide : le nom, Entrée. Le champ se vide et garde le curseur pour l'article suivant. */
export function AddItemForm({ action }: { action: (state: GroceryState, formData: FormData) => Promise<GroceryState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-1.5">
      <label htmlFor="article" className="text-sm font-medium">
        Ajouter un article
      </label>
      <div className="flex gap-2">
        <input
          // La clé change après chaque ajout : le champ repart vide.
          key={state.saved ?? "vide"}
          id="article"
          name="name"
          defaultValue={state.values?.name}
          placeholder="Riz, œufs, bananes…"
          maxLength={60}
          required
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "article-erreur" : undefined}
          className="h-12 min-w-0 flex-1 rounded-control border border-line bg-surface-2 px-3 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <SubmitButton aria-label="Ajouter à la liste" className="shrink-0 px-3.5">
          <PlusIcon size={20} weight="bold" aria-hidden="true" />
        </SubmitButton>
      </div>
      {state.error ? (
        <p id="article-erreur" role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {state.saved ? `${state.saved} ajouté à la liste.` : ""}
      </p>
    </form>
  );
}
