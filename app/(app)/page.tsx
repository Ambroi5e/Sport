import { FlagIcon, GearSixIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { TodayNutritionCard } from "@/components/nutrition/today-card";
import { CheckinCard } from "@/components/progress/checkin-card";
import { PaceAlertNotice } from "@/components/progress/pace-alert";
import { WeekCard } from "@/components/progress/week-card";
import { WeeklyVolume } from "@/components/progress/weekly-volume";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { WeightTrend } from "@/components/weight/trend";
import { getProfile } from "@/lib/auth";
import { addDays, daysBetween, formatShortDate, weekStart } from "@/lib/dates";
import { currentWeek, HIGH_PROTEIN_GOALS, kgTo, nextPlanned, sumNutrients, weeklyVolume } from "@/lib/engine";
import { GOAL_LABELS } from "@/lib/goals";
import { ADAPT_HINTS, dayWord } from "@/lib/planning";
import { getTrainingSetsSince } from "./entrainement/data";
import { getWeekContext } from "./entrainement/semaine/data";
import { saveCheckin } from "./progres/forme/actions";
import { TodaySupplementsCard } from "@/components/supplements/today-card";
import { getSupplements } from "./nutrition/complements/data";
import { getDayLogs, getDayType, getTargets } from "./nutrition/data";
import { getPrimaryGoal, getWeightSummary } from "./weight-data";

export default async function HomePage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const goal = await getPrimaryGoal(profile.user_id);
  const weight = await getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null);
  const monday = weekStart(weight.today);
  // Musculation et force : le volume des 8 dernières semaines a sa place sur l'accueil.
  const strengthGoal = goal ? HIGH_PROTEIN_GOALS.has(goal.type) : false;
  const [meals, targets, dayType, sets, planning, supplements] = await Promise.all([
    getDayLogs(weight.today),
    getTargets(),
    getDayType(weight.today, profile.training_days),
    strengthGoal ? getTrainingSetsSince(addDays(monday, -49)) : Promise.resolve([]),
    getWeekContext(),
    getSupplements(weight.today, profile.timezone),
  ]);
  const { plan, checkin } = planning;
  const inWeek = <T extends { date: string }>(list: readonly T[]) => list.filter((x) => x.date >= monday).map((x) => x.date);
  // Avec un programme, les cercles de la semaine sont les séances placées par le planning (ratées comprises).
  const plannedDays = planning.program ? plan.days.filter((d) => d.session || d.missed).map((d) => d.weekday) : profile.training_days;
  const week = currentWeek(weight.today, inWeek(planning.input.workouts), plannedDays, inWeek(planning.input.activities));
  const planned = planning.program ? planning.program.sessions.length : (profile.sessions_per_week ?? (profile.training_days.length || null));
  const next = nextPlanned(plan);
  const daysLeft = goal?.target_date ? daysBetween(weight.today, goal.target_date) : null;

  return (
    <>
      <PageHeader
        eyebrow={formatShortDate(weight.today)}
        title={`Salut ${profile.display_name ?? ""}`.trim()}
        action={
          // Sur ordinateur, Amis et Réglages sont dans la sidebar ; sur mobile, on y accède d'ici.
          <div className="flex shrink-0 gap-2 md:hidden">
            <Link
              href="/amis"
              aria-label="Amis"
              className="grid size-11 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2"
            >
              <UsersThreeIcon size={22} aria-hidden="true" />
            </Link>
            <Link
              href="/reglages"
              aria-label="Réglages"
              className="grid size-11 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2"
            >
              <GearSixIcon size={22} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
        <div className="grid content-start gap-4">
          <Card aria-labelledby="poids-titre" className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <h2 id="poids-titre" className="text-lg font-semibold">
                Pesée du jour
              </h2>
              <Link href="/progres" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                Courbe
              </Link>
            </div>
            <QuickWeigh
              initial={weight.latest ? Math.round(kgTo(unit, weight.latest.kg) * 10) / 10 : null}
              unit={unit}
              loggedToday={weight.loggedToday}
            />
            <WeightTrend average7={weight.average7} rate={weight.rate} status={weight.status} target={weight.target} unit={unit} />
            {weight.alert && weight.target ? <PaceAlertNotice alert={weight.alert} target={weight.target} unit={unit} /> : null}
          </Card>

          <CheckinCard
            action={saveCheckin}
            current={checkin}
            link={
              <Link href="/progres/forme" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                Courbe
              </Link>
            }
          />

          <WeekCard
            days={week.days}
            done={week.done}
            planned={planned}
            href={planning.program ? "/entrainement/semaine" : "/entrainement"}
            plan={
              planning.program
                ? {
                    today: planning.options?.session.name ?? null,
                    hint: planning.options?.advice ? ADAPT_HINTS[planning.options.advice.action] : null,
                    next: next ? `${next.session.name}, ${dayWord(next.date, weight.today)}` : null,
                  }
                : undefined
            }
          />
        </div>

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
          <TodaySupplementsCard supplements={supplements} href="/nutrition/complements" />

          {strengthGoal && sets.length ? (
            <Card aria-labelledby="volume-titre" className="grid gap-3">
              <div className="flex items-baseline justify-between">
                <h2 id="volume-titre" className="text-lg font-semibold">
                  Volume, 8 semaines
                </h2>
                <Link href="/progres/force" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                  Force
                </Link>
              </div>
              <WeeklyVolume weeks={weeklyVolume(sets, weight.today, 8)} unit={unit} table={false} className="h-28" />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
