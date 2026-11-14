"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { keyBytes, pushSupport, type PushSupport } from "@/lib/push-device";

type Status = "loading" | PushSupport | "not-installed" | "denied" | "off" | "on";
type DeviceAction = (endpoint: string) => Promise<{ error?: string }>;

const MESSAGES: Partial<Record<Status, string>> = {
  loading: "Vérification de cet appareil…",
  unsupported: "Ce navigateur ne sait pas recevoir de notifications web. Essaie avec Chrome, Edge, Firefox ou Safari récent.",
  "ios-install": "Sur iPhone et iPad, les notifications demandent l'app installée : dans Safari, Partager, puis « Sur l'écran d'accueil ». Ouvre ensuite Fonte depuis son icône et reviens ici.",
  "no-worker": "Les notifications ne sont disponibles que sur l'app en ligne, pas sur cette version de développement.",
  "not-installed": "Les rappels ne sont pas encore installés sur ce serveur.",
  denied: "Les notifications de Fonte sont bloquées sur cet appareil. Autorise-les dans les réglages du navigateur ou du téléphone, puis reviens ici.",
  off: "Cet appareil ne reçoit pas de rappel.",
  on: "Cet appareil reçoit tes rappels.",
};

/**
 * Abonne ou désabonne cet appareil. La permission n'est demandée qu'au tap sur
 * « Activer », jamais à l'ouverture de la page.
 */
export function PushDevice({ publicKey, subscribeAction, unsubscribeAction }: { publicKey: string | null; subscribeAction: DeviceAction; unsubscribeAction: DeviceAction }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { support, registration } = await pushSupport();
      let next: Status = support;
      if (support === "ok" && registration) {
        if (!publicKey) next = "not-installed";
        else if (Notification.permission === "denied") next = "denied";
        else {
          const subscription = await registration.pushManager.getSubscription();
          next = subscription ? "on" : "off";
          // L'adresse peut avoir changé sans prévenir : on la redonne au serveur.
          if (subscription) void subscribeAction(subscription.endpoint).catch(() => {});
        }
      }
      if (!cancelled) setStatus(next);
    })().catch(() => {
      if (!cancelled) setStatus("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey, subscribeAction]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const { registration } = await pushSupport();
      if (!registration) return;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const result = await subscribeAction(subscription.endpoint);
      if (result.error) {
        await subscription.unsubscribe().catch(() => {});
        setError(result.error);
        return;
      }
      setStatus("on");
    } catch {
      setError("L'activation n'a pas abouti. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const { registration } = await pushSupport();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const result = await unsubscribeAction(subscription.endpoint);
        if (result.error) {
          setError(result.error);
          return;
        }
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("La désactivation n'a pas abouti. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-[15px] text-muted" aria-live="polite">
        {status === "on" ? <span className="font-medium text-text">{MESSAGES.on}</span> : MESSAGES[status]}
      </p>
      {status === "off" ? (
        <Button size="lg" className="w-full sm:w-auto sm:justify-self-start" onClick={enable} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Activation…" : "Activer sur cet appareil"}
        </Button>
      ) : null}
      {status === "on" ? (
        <Button variant="secondary" className="w-full sm:w-auto sm:justify-self-start" onClick={disable} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Désactivation…" : "Désactiver sur cet appareil"}
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
