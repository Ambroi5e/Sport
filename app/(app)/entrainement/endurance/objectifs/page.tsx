import type { Metadata } from "next";
import { RacePlansView } from "@/components/training/race-plans-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { getOutings } from "../../sports/data";
import { getRacePlans } from "./data";

export const metadata: Metadata = { title: "Objectifs de course" };

export default async function RacePlansPage() {
  const profile = await getProfile();
  const today = localDate(profile!.timezone);
  const [plans, outings] = await Promise.all([getRacePlans(), getOutings(today)]);
  return (
    <>
      <PageHeader title="Objectifs de course" back="/entrainement/endurance" />
      <RacePlansView
        plans={plans}
        outings={outings}
        today={today}
        addHref="/entrainement/endurance/objectifs/ajouter"
        editHref={(id) => `/entrainement/endurance/objectifs/${id}`}
      />
    </>
  );
}
