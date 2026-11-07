import { FlagIcon, GearSixIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { TodayNutritionCard } from "@/components/nutrition/today-card";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { WeightTrend } from "@/components/weight/trend";
import { getProfile } from "@/lib/auth";
import { daysBetween, formatShortDate } from "@/lib/dates";
import { kgTo, sumNutrients } from "@/lib/engine";
import { GOAL_LABELS } from "@/lib/goals";
import { getDayLogs, getDayType, getTargets } from "./nutrition/data";
import { getPrimaryGoal, getWeightSummary } from "./weight-data";

export default async function HomePage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const goal = await getPrimaryGoal(profile.user_id);
  const weight = await getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null);
  const [meals, targets, dayType] = await Promise.all([getDayLogs(weight.today), getTargets(), getDayType(weight.today, profile.training_days)]);
  const daysLeft = goal?.target_date ? daysBetween(weight.today, goal.target_date) : null;

  return (
    <>
      <PageHeader
        eyebrow={formatShortDate(weight.today)}
        title={`Salut ${profile.display_name ?? ""}`.trim()}
        action={
          // Sur ordinateur, Réglages est dans la sidebar ; sur mobile, on y accède d'ici.
          <Link
            href="/reglages"
            aria-label="Réglages"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2 md:hidden"
          >
            <GearSixIcon size={22} aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
        <Card aria-labelledby="poids-titre" className="grid gap-4">
          <div className="flex items-baseline justify-between">
            <h2 id="poids-titre" className="text-lg font-semibold">
              Pesée du jour
            </h2>
            <Link href="/progres" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
              Historique
            </Link>
          </div>
          <QuickWeigh
            initial={weight.latest ? Math.round(kgTo(unit, weight.latest.kg) * 10) / 10 : null}
            unit={unit}
            loggedToday={weight.loggedToday}
          />
          <WeightTrend average7={weight.average7} rate={weight.rate} status={weight.status} target={weight.target} unit={unit} />
        </Card>

        <div className="grid content-start gap-4">
          {goal ? (
            <Card aria-labelledby="objectif-titre" className="grid gap-2">
              <p className="label-caps flex items-center gap-1.5">
                <FlagIcon size={14} weight="fill" aria-hidden="true" /> Objectif
              </p>
              <h2 id="objectif-titre" className="font-title text-[26px]">
                {GOAL_LABELS[goal.type]}
              </h2>
              {daysLeft !== null && daysLeft >= 0 ? (
                <p className="text-[15px] text-muted">
                  <span className="font-numeric text-[22px] text-text">J-{daysLeft}</span> avant le {formatShortDate(goal.target_date!)}
                </p>
              ) : weight.target ? (
                <p className="text-[15px] text-muted">
                  Rythme visé : {weight.target.min.toLocaleString("fr-FR")} à {weight.target.max.toLocaleString("fr-FR")} kg par semaine.
                </p>
              ) : null}
            </Card>
          ) : null}

          <TodayNutritionCard totals={sumNutrients(meals.map((m) => m.nutrients))} target={targets[dayType] ?? null} dayType={dayType} />
        </div>
      </div>
    </>
  );
}
