"use client";

import { useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { flush, pendingIn, useOnline } from "@/lib/offline/outbox";

/**
 * Terminer la séance : envoie d'abord les séries encore sur le téléphone, puis
 * clôt la séance (qui retire les séries non validées). Demande du réseau.
 */
export function FinishWorkoutButton({ userId, workoutId, action }: { userId: string; workoutId: string; action: () => Promise<void> }) {
  const online = useOnline();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pendingIn(userId, workoutId).length === 0) return;
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setMessage(null);
    await flush();
    setSending(false);
    if (pendingIn(userId, workoutId).length === 0) form.requestSubmit();
    else setMessage("Des séries n'ont pas encore pu partir. Réessaie dans un instant.");
  }

  return (
    <form action={action} onSubmit={onSubmit} className="grid gap-2">
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…" disabled={!online || sending}>
        {sending ? "Envoi des séries…" : "Terminer la séance"}
      </SubmitButton>
      {!online ? (
        <p className="text-center text-[13px] text-muted">Terminer demande du réseau. Tes séries restent gardées sur le téléphone.</p>
      ) : null}
      {message ? (
        <p role="alert" className="text-center text-[13px] text-danger">
          {message}
        </p>
      ) : null}
    </form>
  );
}
