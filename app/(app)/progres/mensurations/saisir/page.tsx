import type { Metadata } from "next";
import { MeasurementsForm } from "@/components/progress/measurements-form";
import { MeasurementTips } from "@/components/progress/measurements-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import type { BodySite } from "@/lib/body";
import { addDays, localDate } from "@/lib/dates";
import { isDay } from "@/lib/nutrition";
import { saveMeasurements } from "../../actions";
import { getMeasurements } from "../../data";

export const metadata: Metadata = { title: "Saisir des mensurations" };

export default async function MeasurementEntryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: asked } = await searchParams;
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const minDate = addDays(today, -730);
  const date = isDay(asked) && asked <= today && asked >= minDate ? asked : today;
  const rows = await getMeasurements();

  const current: Partial<Record<BodySite, number>> = {};
  const latest: Partial<Record<BodySite, number>> = {};
  for (const r of rows) {
    if (r.date === date) current[r.site] = r.cm;
    if (r.date < date) latest[r.site] = r.cm;
  }

  return (
    <>
      <PageHeader back="/progres/mensurations" title="Mensurations" />
      <div className="grid gap-4 md:max-w-2xl">
        <MeasurementTips />
        <MeasurementsForm key={date} action={saveMeasurements} date={date} today={today} minDate={minDate} current={current} latest={latest} />
      </div>
    </>
  );
}
