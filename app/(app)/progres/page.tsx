import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { WeightView } from "@/components/progress/weight-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { isWeightPeriod, WEIGHT_PERIODS, type WeightPeriod } from "@/lib/body";
import { getPrimaryGoal, getWeightSummary } from "../weight-data";

export const metadata: Metadata = { title: "Progrès" };

export default async function WeightProgressPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  const period: WeightPeriod = isWeightPeriod(periode) ? periode : "3m";
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const goal = await getPrimaryGoal(profile.user_id);
  // Une semaine de plus que la période : la moyenne du premier jour a besoin des pesées d'avant.
  const weight = await getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null, WEIGHT_PERIODS[period].days + 7);

  return (
    <>
      <PageHeader
        title="Progrès"
        action={
          <Link href="/progres/bilan" className={buttonClasses("secondary", "md", "h-11 shrink-0 px-3 text-[14px]")}>
            Bilan
          </Link>
        }
      />
      <ProgressTabs current="/progres" />
      <WeightView weight={weight} period={period} unit={unit} />
    </>
  );
}
