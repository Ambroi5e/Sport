import type { Metadata } from "next";
import { ActivitiesView } from "@/components/training/activities-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { getActivities } from "./data";

export const metadata: Metadata = { title: "Sports" };

export default async function SportsPage() {
  const [profile, activities] = await Promise.all([getProfile(), getActivities(30)]);
  return (
    <>
      <PageHeader title="Sports" back="/entrainement" />
      <ActivitiesView
        activities={activities}
        today={localDate(profile!.timezone)}
        addHref="/entrainement/sports/ajouter"
        itemHref={(id) => `/entrainement/sports/${id}`}
      />
    </>
  );
}
