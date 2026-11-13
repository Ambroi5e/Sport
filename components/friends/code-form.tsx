"use client";

import { useActionState } from "react";
import type { AcceptState } from "@/app/(app)/amis/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Saisir le code d'un ami. */
export function CodeForm({ action }: { action: (state: AcceptState, formData: FormData) => Promise<AcceptState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-3">
      <Field
        id="code-ami"
        name="code"
        label="Code d'ami"
        placeholder="AMI-AB12-CD34"
        defaultValue={state.value}
        error={state.error}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={40}
        required
      />
      <SubmitButton className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Ajout…">
        Ajouter cet ami
      </SubmitButton>
    </form>
  );
}
