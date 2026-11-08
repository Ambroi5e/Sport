"use client";

import { useActionState, useState } from "react";
import type { DeleteAccountState } from "@/app/(app)/reglages/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DELETE_CONFIRMATION } from "@/lib/account";

/**
 * Confirmation tapée, puis suppression. Le serveur renvoie ensuite vers
 * « Compte supprimé », qui vide ce que l'app gardait sur le téléphone.
 */
export function DeleteAccountForm({ action }: { action: (state: DeleteAccountState, formData: FormData) => Promise<DeleteAccountState> }) {
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState(action, {});
  const ready = typed.trim().toUpperCase() === DELETE_CONFIRMATION;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <Field
        id="confirmation"
        name="confirmation"
        label={`Tape ${DELETE_CONFIRMATION} pour confirmer`}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        error={state.error ?? null}
      />
      <SubmitButton variant="danger" size="lg" disabled={!ready} pendingLabel="Suppression…" className="w-full sm:w-auto sm:justify-self-start">
        Supprimer définitivement mon compte
      </SubmitButton>
    </form>
  );
}
