import { cn } from "@/components/ui/cn";
import { niceTicks } from "@/lib/charts";

export type Bar = {
  key: string;
  /** Libellé court sous la barre. */
  label: string;
  value: number;
  /** Texte au survol : période et valeur. */
  title: string;
  /** Période pas encore terminée : barre atténuée. */
  partial?: boolean;
};

/**
 * Colonnes dessinées côté serveur : une seule série, une seule couleur, barres
 * de 24 px au plus partant de zéro. `labelKey` affiche la valeur au-dessus d'une
 * seule barre ; les autres se lisent sur l'axe, au survol et dans le tableau.
 */
export function BarChart({
  bars,
  format,
  labelKey,
  className = "h-40",
}: {
  bars: Bar[];
  format: (value: number) => string;
  labelKey?: string;
  className?: string;
}) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  const ticks = niceTicks(0, max > 0 ? max : 1, 3);
  const hi = ticks[ticks.length - 1];
  const pct = (v: number) => (v / hi) * 100;

  return (
    <div className={cn("grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2", labelKey ? "pt-5" : "pt-2")} aria-hidden="true">
      <div className={cn("relative", className)}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2 text-[12px] text-muted tabular-nums" style={{ bottom: `${pct(t)}%` }}>
            {format(t)}
          </span>
        ))}
      </div>

      <div className={cn("relative", className)}>
        {ticks.map((t) => (
          <span key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${pct(t)}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end">
          {bars.map((b) => (
            <div key={b.key} title={b.title} className="relative flex h-full min-w-0 flex-1 items-end justify-center px-1">
              {b.value > 0 ? (
                <span
                  className={cn("w-full max-w-6 rounded-t-[4px] bg-chart", b.partial && "opacity-50")}
                  style={{ height: `${pct(b.value)}%` }}
                />
              ) : null}
              {b.key === labelKey && b.value > 0 ? (
                <span
                  className="font-numeric absolute left-1/2 -translate-x-1/2 pb-1 text-[13px] whitespace-nowrap text-text"
                  style={{ bottom: `${pct(b.value)}%` }}
                >
                  {format(b.value)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <span />
      <div className="mt-1.5 flex text-[12px] text-muted">
        {bars.map((b) => (
          <span key={b.key} className="min-w-0 flex-1 truncate text-center">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
