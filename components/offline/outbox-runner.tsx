"use client";

import { useEffect } from "react";
import { registerSessionSenders } from "@/components/training/set-sync";
import { startOutbox } from "@/lib/offline/outbox";

/**
 * Monté sur toutes les pages connectées : envoie ce qui attend encore dans la
 * file (par exemple des séries saisies sans réseau avant que l'app se ferme).
 */
export function OutboxRunner({ userId }: { userId: string }) {
  useEffect(() => {
    registerSessionSenders();
    startOutbox(userId);
  }, [userId]);
  return null;
}
