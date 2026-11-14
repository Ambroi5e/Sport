import type { Metadata } from "next";
import { RemindersView } from "@/components/settings/reminders-view";
import { PageHeader } from "@/components/ui/page-header";
import { saveReminders, subscribeDevice, unsubscribeDevice } from "./actions";
import { getPushDeviceCount, getPushPublicKey, getReminderSettings } from "./data";

export const metadata: Metadata = { title: "Rappels" };

export default async function RemindersPage() {
  const [settings, publicKey, devices] = await Promise.all([getReminderSettings(), getPushPublicKey(), getPushDeviceCount()]);
  return (
    <>
      <PageHeader title="Rappels" back="/reglages" />
      <RemindersView
        settings={settings}
        publicKey={publicKey}
        devices={devices}
        saveAction={saveReminders}
        subscribeAction={subscribeDevice}
        unsubscribeAction={unsubscribeDevice}
      />
    </>
  );
}
