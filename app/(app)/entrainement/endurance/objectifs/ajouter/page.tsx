import type { Metadata } from "next";
import { RacePlanForm } from "@/components/training/race-plan-form";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { saveRacePlan } from "../actions";

export const metadata: Metadata = { title: "Ajouter une course" };

export default async function AddRacePlanPage() {
  const profile = await getProfile();
  const today = localDate(profile!.timezone);
  return (
    <>
      <PageHeader title="Ajouter une course" back="/entrainement/endurance/objectifs" />
      <div className="md:max-w-2xl">
        <RacePlanForm action={saveRacePlan.bind(null, null)} defaults={{ name: "", date: addDays(today, 84), distanceM: null, targetSeconds: null }} today={today} />
      </div>
    </>
  );
}
