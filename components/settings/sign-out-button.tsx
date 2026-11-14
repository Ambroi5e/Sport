"use client";

import { useState, type FormEvent } from "react";
import { stopRest } from "@/components/training/rest-timer";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { clearOutbox, useOutbox } from "@/lib/offline/outbox";
import { forgetSessionCopy } from "@/lib/offline/session-copy";
import { forgetPushDevice } from "@/lib/push-device";
import { clearDeviceData } from "@/lib/session-prefs";

/**
 * Déconnexion : efface du téléphone la file d'attente, la séance gardée et les
 * réglages de séance, et arrête les rappels sur cet appareil. Prévient d'abord s'il reste des séries pas encore envoyées.
 */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const { pending } = useOutbox();
  const [asking, setAsking] = useState(false);

  function clearDevice(event: FormEvent<HTMLFormElement>) {
    if (pending.length && !asking) {
      event.preventDefault();
      setAsking(true);
      return;
    }
    stopRest();
    clearOutbox();
    clearDeviceData();
    forgetSessionCopy();
    forgetPushDevice();
  }

  return (
    <form action={action} onSubmit={clearDevice} className={asking ? "grid gap-3 rounded-control border border-danger/50 p-4" : undefined}>
      {asking ? (
        <>
          <p className="text-[15px]">
            {pending.length} saisie{pending.length > 1 ? "s" : ""} pas encore envoyée{pending.length > 1 ? "s" : ""} (réseau absent ou session
            expirée). Te déconnecter les effacera de ce téléphone.
          </p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="danger">Me déconnecter quand même</SubmitButton>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Annuler
            </Button>
          </div>
        </>
      ) : (
        <SubmitButton variant="secondary" className="w-full">
          Me déconnecter
        </SubmitButton>
      )}
    </form>
  );
}
