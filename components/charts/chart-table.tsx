import type { ReactNode } from "react";

/**
 * Le tableau jumeau d'une courbe : toutes les valeurs, lisibles sans survol ni
 * couleur. Replié par défaut, ouvert d'un tap.
 */
export function ChartTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <details className="group text-[14px]">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-accent-text underline-offset-4 hover:underline">
        Voir les valeurs
      </summary>
      <div className="max-h-80 overflow-y-auto rounded-control border border-line">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2 text-[12px] text-muted">
            <tr>
              {headers.map((h, i) => (
                <th key={h} scope="col" className={i === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 text-right font-medium"}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.key}>
                {r.cells.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2 font-normal text-muted">
                      {c}
                    </th>
                  ) : (
                    <td key={i} className="font-numeric px-3 py-2 text-right tabular-nums">
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
