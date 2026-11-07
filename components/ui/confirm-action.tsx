"use client";

import { useState } from "react";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";

/**
 * Action irréversible en deux temps : le premier tap demande confirmation en
 * nommant ce qui sera supprimé, le second envoie le formulaire.
 */
export function ConfirmAction({
  action,
  label,
  confirmLabel,
  question,
}: {
  action: () => void | Promise<void>;
  label: string;
  confirmLabel: string;
  question: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="ghost" className="text-danger" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="grid gap-3 rounded-control border border-danger/50 p-4">
      <p className="text-[15px]">{question}</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
        <Button variant="ghost" onClick={() => setAsking(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
