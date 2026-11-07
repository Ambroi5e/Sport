import type { Metadata } from "next";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { STRENGTH_WEEKS, StrengthView, strengthExercises } from "@/components/progress/strength-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/dates";
import { getExerciseNames, getTrainingSetsSince } from "../../entrainement/data";

export const metadata: Metadata = { title: "Force" };

export default async function StrengthPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const today = localDate(profile.timezone);
  const start = addDays(weekStart(today), -7 * (STRENGTH_WEEKS - 1));
  const sets = await getTrainingSetsSince(start);
  const names = await getExerciseNames(strengthExercises(sets));

  return (
    <>
      <PageHeader title="Progrès" />
      <ProgressTabs current="/progres/force" />
      <StrengthView sets={sets} names={names} start={start} today={today} unit={unit} />
    </>
  );
}
