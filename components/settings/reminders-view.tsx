import Link from "next/link";
import type { ReminderState } from "@/app/(app)/reglages/rappels/actions";
import { PushDevice } from "@/components/settings/push-device";
import { RemindersForm } from "@/components/settings/reminders-form";
import { Card } from "@/components/ui/card";
import type { ReminderSettings } from "@/lib/reminders";

type DeviceAction = (endpoint: string) => Promise<{ error?: string }>;

/** Réglages > Rappels : l'appareil d'abord (sans lui rien n'arrive), puis les quatre rappels. */
export function RemindersView({
  settings,
  publicKey,
  devices,
  saveAction,
  subscribeAction,
  unsubscribeAction,
}: {
  settings: ReminderSettings;
  publicKey: string | null;
  devices: number;
  saveAction: (state: ReminderState, formData: FormData) => Promise<ReminderState>;
  subscribeAction: DeviceAction;
  unsubscribeAction: DeviceAction;
}) {
  return (
    <div className="grid gap-4 md:max-w-xl">
      <Card aria-labelledby="appareil-titre" className="grid gap-3">
        <div className="grid gap-1">
          <h2 id="appareil-titre" className="text-lg font-semibold">
            Cet appareil
          </h2>
          <p className="text-[13px] text-muted">
            {devices === 0 ? "Aucun appareil ne reçoit tes rappels pour l'instant." : `${devices} appareil${devices > 1 ? "s reçoivent" : " reçoit"} tes rappels.`}
          </p>
        </div>
        <PushDevice publicKey={publicKey} subscribeAction={subscribeAction} unsubscribeAction={unsubscribeAction} />
      </Card>

      <Card aria-labelledby="rappels-titre" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="rappels-titre" className="text-lg font-semibold">
            Mes rappels
          </h2>
          <p className="text-[15px] text-muted">Un rappel part une fois par jour au plus, et seulement s&apos;il sert encore.</p>
        </div>
        <RemindersForm settings={settings} action={saveAction} />
      </Card>

      <p className="text-[13px] text-muted">
        Le signal envoyé à ton téléphone est vide : il passe par le service de notifications de ton navigateur (Google, Apple, Mozilla ou Microsoft), qui ne reçoit
        aucune de tes données. Le texte du rappel est demandé à Fonte par ton téléphone. Détails dans{" "}
        <Link href="/confidentialite" className="underline underline-offset-2">
          Confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
