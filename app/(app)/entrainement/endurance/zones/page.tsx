import type { Metadata } from "next";
import { HrZonesView } from "@/components/training/hr-zones-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { getOutings } from "../../sports/data";
import { saveHeartRates } from "./actions";

export const metadata: Metadata = { title: "Zones cardiaques" };

export default async function HrZonesPage() {
  const profile = await getProfile();
  const today = localDate(profile!.timezone);
  const outings = await getOutings(today);
  return (
    <>
      <PageHeader title="Zones cardiaques" back="/entrainement/endurance" />
      <HrZonesView hrMax={profile!.hr_max} hrRest={profile!.hr_rest} birthYear={profile!.birth_year} outings={outings} today={today} action={saveHeartRates} />
    </>
  );
}
