"use client";

import { useEffect } from "react";
import { stopRest } from "@/components/training/rest-timer";
import { clearOutbox } from "@/lib/offline/outbox";
import { forgetSessionCopy } from "@/lib/offline/session-copy";
import { forgetPushDevice } from "@/lib/push-device";
import { clearDeviceData } from "@/lib/session-prefs";

/** Efface ce que l'app garde sur l'appareil, comme à la déconnexion. Rien à afficher. */
export function ClearDevice() {
  useEffect(() => {
    stopRest();
    clearOutbox();
    clearDeviceData();
    forgetSessionCopy();
    forgetPushDevice();
  }, []);
  return null;
}
