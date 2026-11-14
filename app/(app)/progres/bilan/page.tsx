import type { Metadata } from "next";
import { PaceAlertNotice } from "@/components/progress/pace-alert";
import { ReviewView } from "@/components/progress/review-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart as mondayOf } from "@/lib/dates";
import { reviewWeek } from "@/lib/engine";
import { isDay } from "@/lib/nutrition";
import { getPrimaryGoal, getWeightSummary } from "../../weight-data";
import { saveReview } from "./actions";
import { getSavedReview, getSavedReviews, getWeekReview } from "./data";

export const metadata: Metadata = { title: "Bilan de la semaine" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ semaine?: string }> }) {
  const { semaine } = await searchParams;
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const thisMonday = mondayOf(today);
  const proposed = reviewWeek(today);
  // Semaine demandée si c'est un lundi passé (deux ans au plus), sinon celle que le bilan propose.
  const week = isDay(semaine) && mondayOf(semaine) === semaine && semaine <= thisMonday && semaine >= addDays(today, -730) ? semaine : proposed;
  const goal = await getPrimaryGoal(profile.user_id);
  const [review, saved, history, weight] = await Promise.all([
    getWeekReview(week, profile, goal?.type ?? null),
    getSavedReview(week),
    getSavedReviews(),
    week === proposed ? getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null) : null,
  ]);
  const href = (w: string) => (w === proposed ? "/progres/bilan" : `/progres/bilan?semaine=${w}`);

  return (
    <>
      <PageHeader title="Bilan de la semaine" eyebrow="Progrès" back="/progres" />
      <ReviewView
        review={review}
        unit={profile.weight_unit === "lb" ? "lb" : "kg"}
        saved={saved}
        history={history}
        current={week === thisMonday && today < addDays(week, 6)}
        prevHref={href(addDays(week, -7))}
        nextHref={week < thisMonday ? href(addDays(week, 7)) : null}
        weekHref={href}
        notice={weight?.alert && weight.target ? <PaceAlertNotice alert={weight.alert} target={weight.target} unit={profile.weight_unit === "lb" ? "lb" : "kg"} /> : null}
        saveAction={saveReview.bind(null, week)}
      />
    </>
  );
}
