"use client";

import { CheckIcon, CopyIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import type { InviteState } from "@/app/(app)/amis/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Inviter un ami : un code à usage unique, affiché une seule fois, à copier ou à
 * envoyer par la feuille de partage du téléphone.
 */
export function InviteCard({ action }: { action: () => Promise<InviteState> }) {
  const [state, formAction] = useActionState<InviteState>(action, {});
  const [copied, setCopied] = useState(false);
  const message = state.code ? `Ajoute-moi sur Fonte : mon code d'ami est ${state.code} (Amis > J'ai un code, valable 7 jours).` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.code!);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
      {state.code ? (
        <div className="grid gap-3 rounded-control bg-surface-2 p-4" role="status">
          <p className="text-[13px] text-muted">Ton code, à donner à ton ami. Il ne s&apos;affiche qu&apos;une fois.</p>
          <p className="font-numeric select-all text-[28px] tracking-wide">{state.code}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copy}>
              {copied ? <CheckIcon size={18} weight="bold" aria-hidden="true" /> : <CopyIcon size={18} aria-hidden="true" />}
              {copied ? "Copié" : "Copier"}
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <Button variant="secondary" onClick={() => navigator.share({ text: message }).catch(() => undefined)}>
                <ShareNetworkIcon size={18} aria-hidden="true" /> Envoyer
              </Button>
            ) : null}
          </div>
          <p className="text-[13px] text-muted">Valable 7 jours, pour une seule personne. Elle doit déjà avoir son compte Fonte.</p>
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <form action={formAction}>
        <SubmitButton variant={state.code ? "secondary" : "primary"} className="w-full sm:w-auto" pendingLabel="Création…">
          {state.code ? "Créer un autre code" : "Créer un code d'ami"}
        </SubmitButton>
      </form>
    </div>
  );
}
