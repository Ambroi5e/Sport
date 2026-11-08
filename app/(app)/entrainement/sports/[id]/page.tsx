import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/training/activity-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { formatLongDate, localDate } from "@/lib/dates";
import { activityName, SPORTS } from "@/lib/sports";
import { deleteActivity, saveActivity } from "../actions";
import { getActivity, getLatestWeightKg } from "../data";

export const metadata: Metadata = { title: "Activité" };

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [profile, activity, latest] = await Promise.all([getProfile(), getActivity(id), getLatestWeightKg()]);
  if (!activity) notFound();
  const name = activityName(activity.sport, activity.label);

  return (
    <>
      <PageHeader title={name} eyebrow={formatLongDate(activity.date)} back="/entrainement/sports" />
      <div className="grid gap-6 md:max-w-2xl">
        <ActivityForm
          action={saveActivity.bind(null, activity.id)}
          defaults={{ sport: activity.sport, label: activity.label ?? "", minutes: activity.minutes, intensity: activity.intensity, date: activity.date }}
          sports={SPORTS}
          today={localDate(profile!.timezone)}
          weightKg={activity.weightKg ?? latest}
        />
        <ConfirmAction
          action={deleteActivity.bind(null, activity.id)}
          label="Supprimer cette activité"
          confirmLabel="Supprimer"
          question={`Supprimer ${name} du ${formatLongDate(activity.date)} ?`}
        />
      </div>
    </>
  );
}
