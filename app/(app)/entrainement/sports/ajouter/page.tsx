import type { Metadata } from "next";
import { ActivityForm } from "@/components/training/activity-form";
import { ActivityRepeat } from "@/components/training/activity-repeat";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { saveActivity } from "../actions";
import { getLatestWeightKg, getSportHabits } from "../data";

export const metadata: Metadata = { title: "Noter un sport" };

/**
 * La dernière activité se refait en un tap (+, Sport, Enregistrer) ; le formulaire,
 * prérempli avec elle, sert à changer le sport, le jour, la durée ou l'intensité.
 */
export default async function AddActivityPage() {
  const [profile, habits, weightKg] = await Promise.all([getProfile(), getSportHabits(), getLatestWeightKg()]);
  const today = localDate(profile!.timezone);
  const last = habits.last;
  return (
    <>
      <PageHeader title="Noter un sport" back="/entrainement/sports" />
      <div className="grid gap-6 md:max-w-2xl">
        {last ? <ActivityRepeat action={saveActivity.bind(null, null)} last={last} today={today} /> : null}
        {last ? <h2 className="text-lg font-semibold">Ou autre chose</h2> : null}
        <ActivityForm
          action={saveActivity.bind(null, null)}
          defaults={{
            sport: last?.sport ?? habits.order[0],
            label: last?.label ?? "",
            minutes: last?.minutes ?? 60,
            intensity: last?.intensity ?? "moderee",
            date: today,
          }}
          sports={habits.order}
          today={today}
          weightKg={weightKg}
        />
      </div>
    </>
  );
}
