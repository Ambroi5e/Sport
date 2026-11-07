"use client";

import { CopyIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createInvite, type InviteState } from "./actions";

export function InviteButton() {
  const [state, action, pending] = useActionState(createInvite, {} as InviteState);
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-3">
      <form action={action}>
        <Button type="submit" disabled={pending}>
          Créer un code d&apos;invitation
        </Button>
      </form>
      {state.code ? (
        <div className="grid gap-2 rounded-control border border-accent/60 bg-accent/10 p-4">
          <p className="text-sm text-muted">Code valable 14 jours, utilisable une seule fois. Il ne sera plus affiché ensuite.</p>
          <div className="flex items-center gap-3">
            <code className="font-numeric select-all text-[28px] tracking-wider">{state.code}</code>
            <Button
              variant="secondary"
              aria-label="Copier le code"
              onClick={() => {
                navigator.clipboard.writeText(state.code!).then(() => setCopied(true), () => setCopied(false));
              }}
            >
              <CopyIcon size={18} aria-hidden="true" /> {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>
      ) : null}
      {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
    </div>
  );
}
