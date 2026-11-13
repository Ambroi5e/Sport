import type { Metadata } from "next";
import { WeekPlanView } from "@/components/training/week-plan-view";
import { PageHeader } from "@/components/ui/page-header";
import { formatLongDate } from "@/lib/dates";
import { startWorkout } from "../actions";
import { getActiveWorkout } from "../data";
import { freeDay, moveSession, postponeSession } from "./actions";
import { getWeekContext } from "./data";

export const metadata: Metadata = { title: "Ma semaine" };

export default async function WeekPage() {
  const [week, active] = await Promise.all([getWeekContext(), getActiveWorkout()]);
  return (
    <>
      <PageHeader back="/entrainement" eyebrow={formatLongDate(week.today)} title="Ma semaine" />
      <WeekPlanView
        data={{
          today: week.today,
          plan: week.plan,
          options: week.options,
          load: week.load,
          availableDays: week.profile.training_days,
          weeklySports: week.weeklySports,
          hasProgram: week.program !== null,
          active: active ? { id: active.id, name: active.name } : null,
        }}
        actions={{
          start: startWorkout,
          move: (id) => moveSession.bind(null, id),
          postpone: (id) => postponeSession.bind(null, id),
          free: (date) => freeDay.bind(null, date),
        }}
        moveHref={(id) => `/entrainement/semaine/deplacer/${id}`}
        typeHref="/entrainement/semaine/type"
        programHref="/entrainement/programme"
        checkinHref="/progres/forme"
        workoutHref={(id) => `/entrainement/seance/${id}`}
      />
    </>
  );
}
