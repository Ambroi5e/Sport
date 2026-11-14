import type { Metadata } from "next";
import { GpxImport } from "@/components/training/gpx-import";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { saveActivity } from "../actions";
import { getLatestWeightKg, getSportHabits } from "../data";

export const metadata: Metadata = { title: "Importer une sortie" };

export default async function ImportActivityPage() {
  const [profile, habits, weightKg] = await Promise.all([getProfile(), getSportHabits(), getLatestWeightKg()]);
  return (
    <>
      <PageHeader title="Importer une sortie" back="/entrainement/sports/ajouter" />
      <div className="md:max-w-2xl">
        <GpxImport action={saveActivity.bind(null, null)} sports={habits.order} today={localDate(profile!.timezone)} timeZone={profile!.timezone} weightKg={weightKg} />
      </div>
    </>
  );
}
