import type { Metadata } from "next";
import { NutritionDay } from "@/components/nutrition/nutrition-day";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { pickDay } from "./context";
import { getDayLogs, getDayType, getTargets } from "./data";

export const metadata: Metadata = { title: "Nutrition" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const day = pickDay((await searchParams).jour, today);
  const [entries, previous, targets, dayType] = await Promise.all([
    getDayLogs(day),
    getDayLogs(addDays(day, -1)),
    getTargets(),
    getDayType(day, profile.training_days),
  ]);

  return (
    <>
      <PageHeader title="Nutrition" />
      <NutritionDay day={day} today={today} dayType={dayType} entries={entries} previous={previous} targets={targets} />
    </>
  );
}
