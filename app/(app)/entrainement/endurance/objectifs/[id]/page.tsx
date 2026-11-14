import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RacePlanForm } from "@/components/training/race-plan-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { formatLongDate, localDate } from "@/lib/dates";
import { deleteRacePlan, saveRacePlan } from "../actions";
import { getRacePlan } from "../data";

export const metadata: Metadata = { title: "Objectif de course" };

export default async function RacePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [profile, plan] = await Promise.all([getProfile(), getRacePlan(id)]);
  if (!plan) notFound();
  return (
    <>
      <PageHeader title={plan.name} eyebrow={formatLongDate(plan.date)} back="/entrainement/endurance/objectifs" />
      <div className="grid gap-6 md:max-w-2xl">
        <RacePlanForm
          action={saveRacePlan.bind(null, plan.id)}
          defaults={{ name: plan.name, date: plan.date, distanceM: plan.distanceM, targetSeconds: plan.targetSeconds }}
          today={localDate(profile!.timezone)}
        />
        <ConfirmAction action={deleteRacePlan.bind(null, plan.id)} label="Supprimer cette course" confirmLabel="Supprimer" question={`Supprimer « ${plan.name} » ?`} />
      </div>
    </>
  );
}
