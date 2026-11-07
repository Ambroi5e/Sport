import { ScalesIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart, LineLegend } from "@/components/charts/line-chart";
import { PaceAlertNotice } from "@/components/progress/pace-alert";
import { LinkChips, ProgressTabs } from "@/components/progress/progress-tabs";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WeightTrend } from "@/components/weight/trend";
import { getProfile } from "@/lib/auth";
import { formatDelta, isWeightPeriod, WEIGHT_PERIODS, type WeightPeriod } from "@/lib/body";
import { formatAxisDate } from "@/lib/charts";
import { addDays, formatShortDate } from "@/lib/dates";
import { kgTo, weightSeries } from "@/lib/engine";
import { getPrimaryGoal, getWeightSummary } from "../weight-data";

export const metadata: Metadata = { title: "Progrès" };

const oneDecimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const axis = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export default async function WeightProgressPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  const period: WeightPeriod = isWeightPeriod(periode) ? periode : "3m";
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const goal = await getPrimaryGoal(profile.user_id);
  // Une semaine de plus que la période : la moyenne du premier jour a besoin des pesées d'avant.
  const days = WEIGHT_PERIODS[period].days;
  const weight = await getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null, days + 7);
  const from = addDays(weight.today, -days);
  const series = weightSeries(weight.entries, from, weight.today);
  const toUnit = (p: { date: string; value: number }) => ({ date: p.date, value: kgTo(unit, p.value) });
  const points = series.weighIns.map(toUnit);
  const average = series.average.map(toUnit);
  const averageByDate = new Map(average.map((p) => [p.date, p.value]));
  const first = average[0];
  const last = average[average.length - 1];

  return (
    <>
      <PageHeader title="Progrès" />
      <ProgressTabs current="/progres" />
      {weight.entries.length === 0 ? (
        <EmptyState icon={<ScalesIcon size={22} />} title="Aucune pesée pour l'instant">
          Pèse-toi depuis l&apos;accueil : la courbe, la moyenne sur 7 jours et ton rythme hebdomadaire apparaîtront ici.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
          <Card aria-labelledby="courbe-titre" className="grid content-start gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="courbe-titre" className="text-lg font-semibold">
                Poids
              </h2>
              <LinkChips
                label="Période"
                items={(Object.keys(WEIGHT_PERIODS) as WeightPeriod[]).map((p) => ({
                  href: p === "3m" ? "/progres" : `/progres?periode=${p}`,
                  label: WEIGHT_PERIODS[p].label,
                  current: p === period,
                }))}
              />
            </div>
            {points.length === 0 ? (
              <p className="text-[15px] text-muted">Aucune pesée sur cette période.</p>
            ) : (
              <figure className="grid gap-3">
                <LineChart points={points} line={average} from={from} to={weight.today} format={(v) => axis.format(v)} />
                <LineLegend points="Pesée" line="Moyenne sur 7 jours" />
                <figcaption className="text-[14px] text-muted">
                  {first && last && first.date !== last.date
                    ? `Moyenne sur 7 jours : ${oneDecimal.format(first.value)} ${unit} le ${formatAxisDate(first.date)}, ${oneDecimal.format(last.value)} ${unit} le ${formatAxisDate(last.date)}, soit ${formatDelta(last.value - first.value)} ${unit}.`
                    : `${points.length} pesée${points.length > 1 ? "s" : ""} sur la période.`}
                </figcaption>
                <ChartTable
                  caption={`Pesées et moyenne sur 7 jours, en ${unit}`}
                  headers={["Date", "Pesée", "Moyenne 7 j"]}
                  rows={[...points].reverse().map((p) => {
                    const avg = averageByDate.get(p.date);
                    return { key: p.date, cells: [formatShortDate(p.date), oneDecimal.format(p.value), avg === undefined ? "–" : oneDecimal.format(avg)] };
                  })}
                />
              </figure>
            )}
          </Card>

          <div className="grid content-start gap-4">
            <Card aria-labelledby="tendance-titre" className="grid gap-4">
              <h2 id="tendance-titre" className="text-lg font-semibold">
                Tendance
              </h2>
              <WeightTrend average7={weight.average7} rate={weight.rate} status={weight.status} target={weight.target} unit={unit} />
              {weight.alert && weight.target ? <PaceAlertNotice alert={weight.alert} target={weight.target} unit={unit} /> : null}
              {weight.target ? (
                <p className="text-[13px] text-muted">
                  L&apos;alerte compare tes moyennes de trois semaines glissantes : elle ne se déclenche que si deux semaines de suite sortent de la
                  fourchette dans le même sens. Il faut au moins deux pesées par semaine.
                </p>
              ) : null}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
