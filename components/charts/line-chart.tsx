import { cn } from "@/components/ui/cn";
import { datePercent, dateTicks, formatAxisDate, niceTicks } from "@/lib/charts";

export type Point = { date: string; value: number };

/**
 * Courbe dessinée côté serveur, sans JavaScript : `points` en pastilles (les
 * pesées brutes), `line` en trait plein avec une pastille au bout (la moyenne).
 * Le tracé est décoratif pour les lecteurs d'écran : la page donne un résumé
 * écrit et le tableau des valeurs. Au survol, chaque pastille affiche sa valeur.
 */
export function LineChart({
  points = [],
  line = [],
  from,
  to,
  format,
  className = "h-44",
  ticks: tickCount = 4,
}: {
  points?: Point[];
  line?: Point[];
  from: string;
  to: string;
  format: (value: number) => string;
  /** Hauteur de la zone de tracé. */
  className?: string;
  ticks?: number;
}) {
  const values = [...points, ...line].map((p) => p.value);
  if (values.length === 0) return null;

  const ticks = niceTicks(Math.min(...values), Math.max(...values), tickCount);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (date: string) => datePercent(date, from, to);
  const y = (value: number) => ((hi - value) / (hi - lo)) * 100;
  const path = line.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(2)} ${y(p.value).toFixed(2)}`).join(" ");
  const end = line[line.length - 1];
  const dense = points.length > 40;
  const dates = dateTicks(from, to, 4);

  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 pt-2" aria-hidden="true">
      <div className={cn("relative", className)}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2 text-[12px] text-muted tabular-nums" style={{ top: `${y(t)}%` }}>
            {format(t)}
          </span>
        ))}
      </div>

      <div className={cn("relative", className)}>
        {ticks.map((t) => (
          <span key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${y(t)}%` }} />
        ))}
        {line.length > 1 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <path d={path} fill="none" className="stroke-chart" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}
        {points.map((p) => (
          <span
            key={p.date}
            title={`${formatAxisDate(p.date)} : ${format(p.value)}`}
            className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${x(p.date)}%`, top: `${y(p.value)}%` }}
          >
            <span className={cn("rounded-full bg-muted", dense ? "size-1.5 opacity-70" : "size-2 ring-2 ring-surface")} />
          </span>
        ))}
        {end ? (
          <span
            title={`${formatAxisDate(end.date)} : ${format(end.value)}`}
            className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${x(end.date)}%`, top: `${y(end.value)}%` }}
          >
            <span className="size-2.5 rounded-full bg-chart ring-2 ring-surface" />
          </span>
        ) : null}
      </div>

      <span />
      <div className="relative mt-1.5 h-4 text-[12px] text-muted">
        {dates.map((d, i) => (
          <span
            key={d}
            className={cn("absolute top-0 whitespace-nowrap", i === 0 ? "" : i === dates.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
            style={{ left: `${x(d)}%` }}
          >
            {formatAxisDate(d)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Légende d'une courbe à deux séries : pastille pour les points, trait pour la ligne. */
export function LineLegend({ points, line }: { points: string; line: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
      <li className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-muted" aria-hidden="true" />
        {points}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-chart" aria-hidden="true" />
        {line}
      </li>
    </ul>
  );
}
