import { BarChart } from "@/components/charts/bar-chart";
import { ChartTable } from "@/components/charts/chart-table";
import { formatAxisDate } from "@/lib/charts";
import { kgTo, type WeekVolume, type WeightUnit } from "@/lib/engine";
import { formatVolume } from "@/lib/training";

const axisFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function axis(unit: WeightUnit) {
  return (v: number) => (v >= 1000 ? `${axisFormat.format(v / 1000)} ${unit === "kg" ? "t" : "k"}` : axisFormat.format(v));
}

function sessions(n: number) {
  return `${n} séance${n > 1 ? "s" : ""}`;
}

/** Volume des dernières semaines en colonnes, la semaine en cours atténuée, avec résumé et tableau. */
export function WeeklyVolume({ weeks, unit, table = true, className }: { weeks: WeekVolume[]; unit: WeightUnit; table?: boolean; className?: string }) {
  const current = weeks[weeks.length - 1];
  const previous = weeks.slice(0, -1);
  const average = previous.length ? previous.reduce((s, w) => s + w.volume, 0) / previous.length : 0;

  return (
    <figure className="grid gap-3">
      <BarChart
        className={className}
        format={axis(unit)}
        labelKey={current.weekStart}
        bars={weeks.map((w, i) => {
          const [, m, d] = w.weekStart.split("-");
          return {
            key: w.weekStart,
            label: `${Number(d)}/${Number(m)}`,
            value: kgTo(unit, w.volume),
            title: `Semaine du ${formatAxisDate(w.weekStart)} : ${formatVolume(w.volume, unit)}, ${sessions(w.sessions)}`,
            partial: i === weeks.length - 1,
          };
        })}
      />
      <figcaption className="text-[14px] text-muted">
        Cette semaine (en cours) : {formatVolume(current.volume, unit)} en {sessions(current.sessions)}. Moyenne des {previous.length} semaines
        précédentes : {formatVolume(average, unit)}.
      </figcaption>
      {table ? (
        <ChartTable
          caption={`Volume par semaine, en ${unit}`}
          headers={["Semaine du", "Séances", "Séries", "Volume"]}
          rows={[...weeks].reverse().map((w) => ({
            key: w.weekStart,
            cells: [formatAxisDate(w.weekStart), w.sessions, w.sets, formatVolume(w.volume, unit)],
          }))}
        />
      ) : null}
    </figure>
  );
}
