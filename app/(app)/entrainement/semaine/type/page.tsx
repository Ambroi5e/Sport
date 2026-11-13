import type { Metadata } from "next";
import { WeekTypeView } from "@/components/training/week-type-view";
import { PageHeader } from "@/components/ui/page-header";
import { getSportHabits } from "../../sports/data";
import { addWeeklySport, deleteWeeklySport, saveAvailableDays } from "../actions";
import { getWeekContext } from "../data";

export const metadata: Metadata = { title: "Semaine type" };

export default async function WeekTypePage() {
  const [week, habits] = await Promise.all([getWeekContext(), getSportHabits()]);
  return (
    <>
      <PageHeader back="/entrainement/semaine" eyebrow="Ma semaine" title="Semaine type" />
      <WeekTypeView
        availableDays={week.profile.training_days}
        weeklySports={week.weeklySports}
        sports={habits.order}
        defaults={habits.last ? { sport: habits.last.sport, minutes: habits.last.minutes, intensity: habits.last.intensity } : { sport: "padel", minutes: 90, intensity: "moderee" }}
        saveDaysAction={saveAvailableDays}
        addSportAction={addWeeklySport}
        deleteSportAction={(id) => deleteWeeklySport.bind(null, id)}
      />
    </>
  );
}
