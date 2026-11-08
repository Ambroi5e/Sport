import { ChartTable } from "@/components/charts/chart-table";
import { LineChart, LineLegend } from "@/components/charts/line-chart";
import { LinkChips } from "@/components/progress/progress-tabs";
import { Card } from "@/components/ui/card";
import { formatAxisDate } from "@/lib/charts";
import { addDays, formatShortDate } from "@/lib/dates";
import type { ReactNode } from "react";
import { CHECKIN_FIELDS, checkinAverages, GOOD_READINESS, LOW_READINESS, readinessSeries, type DatedCheckin } from "@/lib/engine";
import { CHECKIN_SCALES, formatScore, HEALTH_REMINDER, HIGHER_IS_BETTER, READINESS_PERIODS, type ReadinessPeriod } from "@/lib/readiness";

/** Écart de moins de 0,3 point : on dit « stable » plutôt que d'inventer une tendance. */
const STABLE = 0.3;

function trend(field: (typeof CHECKIN_FIELDS)[number], current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < STABLE) return "stable";
  return delta > 0 === HIGHER_IS_BETTER[field] ? "mieux qu'avant" : "moins bien qu'avant";
}

/**
 * Courbe de forme : la note de chaque check-in, sa moyenne sur 7 jours, et chaque
 * critère sur 7 jours face aux 7 jours d'avant. Le check-in du jour (`checkin`)
 * passe en premier sur mobile, à droite au-dessus des moyennes sur ordinateur.
 */
export function ReadinessView({ checkins, today, period, checkin }: { checkins: DatedCheckin[]; today: string; period: ReadinessPeriod; checkin: ReactNode }) {
  const from = addDays(today, -READINESS_PERIODS[period].days);
  const { points, average } = readinessSeries(checkins, from, today);
  const byDate = new Map(average.map((p) => [p.date, p.value]));
  const last = average.at(-1);
  const { current, previous, count } = checkinAverages(checkins, today);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
      <div className="md:col-start-2 md:row-start-1">{checkin}</div>
      <Card aria-labelledby="courbe-forme-titre" className="grid content-start gap-4 md:col-start-1 md:row-span-2 md:row-start-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="courbe-forme-titre" className="text-lg font-semibold">
            Courbe de forme
          </h2>
          <LinkChips
            label="Période"
            items={(Object.keys(READINESS_PERIODS) as ReadinessPeriod[]).map((p) => ({
              href: p === "1m" ? "/progres/forme" : `/progres/forme?periode=${p}`,
              label: READINESS_PERIODS[p].label,
              current: p === period,
            }))}
          />
        </div>
        {points.length === 0 ? (
          <p className="text-[15px] text-muted">
            Aucun check-in sur cette période. Fais-le chaque matin, en dix secondes : la courbe apparaît dès le deuxième jour.
          </p>
        ) : (
          <figure className="grid gap-3">
            <LineChart
              points={points}
              line={average}
              from={from}
              to={today}
              format={(v) => (Number.isInteger(v) ? String(v) : formatScore(v))}
              domain={[1, 5]}
              goal={GOOD_READINESS}
            />
            <LineLegend points="Note du jour" line="Moyenne sur 7 jours" goal="Seuil de bonne forme" />
            <figcaption className="text-[14px] text-muted">
              {last
                ? `Moyenne sur 7 jours au ${formatAxisDate(last.date)} : ${formatScore(last.value)} sur 5, sur ${points.length} check-in${points.length > 1 ? "s" : ""} de la période.`
                : null}
            </figcaption>
            <ChartTable
              caption="Note de forme et moyenne sur 7 jours, sur 5"
              headers={["Date", "Note", "Moyenne 7 j"]}
              rows={[...points].reverse().map((p) => {
                const avg = byDate.get(p.date);
                return { key: p.date, cells: [formatShortDate(p.date), formatScore(p.value), avg === undefined ? "–" : formatScore(avg)] };
              })}
            />
          </figure>
        )}
      </Card>

      <Card aria-labelledby="sept-jours-titre" className="grid gap-3 md:col-start-2 md:row-start-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="sept-jours-titre" className="text-lg font-semibold">
            Sur 7 jours
          </h2>
          <span className="text-[13px] text-muted">face aux 7 jours d&apos;avant</span>
        </div>
        {count === 0 ? (
          <p className="text-[15px] text-muted">Pas de check-in ces 7 derniers jours.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-2">
            {CHECKIN_FIELDS.map((f) => (
              <div key={f} className="grid gap-0.5 rounded-control bg-surface-2 p-3">
                <dt className="text-[13px] text-muted">{CHECKIN_SCALES[f].label}</dt>
                <dd className="font-numeric text-[22px]">{current[f] === null ? "–" : formatScore(current[f]!)}</dd>
                <dd className="text-[12px] text-muted">{trend(f, current[f], previous[f]) ?? "sur 5"}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-[13px] text-muted">
          Note de forme : moyenne du sommeil, de l&apos;énergie, et de l&apos;inverse des courbatures et du stress (6 − la note). Basse sous{" "}
          {formatScore(LOW_READINESS)}, ou après une très mauvaise nuit, ou avec de fortes courbatures ; bonne à {formatScore(GOOD_READINESS)} et plus, sans
          aucune note à son pire. {HEALTH_REMINDER}
        </p>
      </Card>
    </div>
  );
}

