import type { Metadata } from "next";
import { CheckinCard } from "@/components/progress/checkin-card";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { ReadinessView } from "@/components/progress/readiness-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { isReadinessPeriod, READINESS_PERIODS, type ReadinessPeriod } from "@/lib/readiness";
import { saveCheckin } from "./actions";
import { getCheckins } from "./data";

export const metadata: Metadata = { title: "Forme" };

export default async function ReadinessPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  const period: ReadinessPeriod = isReadinessPeriod(periode) ? periode : "1m";
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  // Une semaine de plus : la moyenne du premier jour et la comparaison aux 7 jours d'avant en ont besoin.
  const checkins = await getCheckins(addDays(today, -Math.max(READINESS_PERIODS[period].days, 14) - 7));
  const current = checkins.find((c) => c.date === today) ?? null;

  return (
    <>
      <PageHeader title="Progrès" />
      <ProgressTabs current="/progres/forme" />
      <ReadinessView checkins={checkins} today={today} period={period} checkin={<CheckinCard action={saveCheckin} current={current} />} />
    </>
  );
}
