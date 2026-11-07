import { RulerIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BODY_SITES, formatCm, formatDelta, SITE_LABELS, type MeasurementRow } from "@/lib/body";
import { formatAxisDate } from "@/lib/charts";
import { formatShortDate } from "@/lib/dates";
import { measurementChanges } from "@/lib/engine";

/** Section Mensurations : dernière valeur et écarts par zone, historique par date. */
export function MeasurementsView({ rows }: { rows: MeasurementRow[] }) {
  const changes = measurementChanges(rows);
  const sites = BODY_SITES.filter((s) => changes[s]);
  const byDate = new Map<string, typeof rows>();
  for (const r of [...rows].reverse()) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);

  const add = (
    <Link href="/progres/mensurations/saisir" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
      Saisir des mensurations
    </Link>
  );

  return (
    <>
      {rows.length === 0 ? (
        <div className="grid gap-4 md:max-w-xl">
          <EmptyState icon={<RulerIcon size={22} />} title="Aucune mensuration pour l'instant">
            Bras, taille, cuisse… Mesure une fois par mois environ : l&apos;écart depuis ta première mesure s&apos;affichera ici, zone par zone. Le
            poids seul ne dit pas tout.
          </EmptyState>
          {add}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
          <Card aria-labelledby="dernieres-titre" className="grid content-start gap-3">
            <h2 id="dernieres-titre" className="text-lg font-semibold">
              Dernières mesures
            </h2>
            <ul className="divide-y divide-line">
              {sites.map((s) => {
                const c = changes[s];
                return (
                  <li key={s} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-medium">{SITE_LABELS[s]}</p>
                      <p className="text-[13px] text-muted">
                        {c.count > 1 ? (
                          <>
                            {formatDelta(c.sinceFirst)} cm depuis le {formatAxisDate(c.first.date)}
                            {c.count > 2 && c.sincePrevious !== null ? ` · ${formatDelta(c.sincePrevious)} depuis la fois d'avant` : null}
                          </>
                        ) : (
                          `Première mesure, le ${formatAxisDate(c.latest.date)}`
                        )}
                      </p>
                    </div>
                    <p className="font-numeric shrink-0 text-[24px]">
                      {formatCm(c.latest.cm)}
                      <span className="ml-1 font-sans text-[13px] font-semibold text-muted">cm</span>
                    </p>
                  </li>
                );
              })}
            </ul>
            {add}
          </Card>

          <Card aria-labelledby="historique-titre" className="grid content-start gap-2">
            <h2 id="historique-titre" className="text-lg font-semibold">
              Historique
            </h2>
            <ul className="divide-y divide-line">
              {[...byDate].map(([date, list]) => (
                <li key={date} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-medium">{formatShortDate(date)}</h3>
                    <Link
                      href={`/progres/mensurations/saisir?date=${date}`}
                      aria-label={`Modifier les mesures du ${formatShortDate(date)}`}
                      className="text-[14px] font-medium text-accent-text underline-offset-4 hover:underline"
                    >
                      Modifier
                    </Link>
                  </div>
                  <p className="mt-1 text-[14px] text-muted">
                    {BODY_SITES.flatMap((s) => {
                      const r = list.find((x) => x.site === s);
                      return r ? [`${SITE_LABELS[s]} ${formatCm(r.cm)}`] : [];
                    }).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

/** Rappels pour des mesures comparables d'une fois sur l'autre. */
export function MeasurementTips() {
  return (
    <Card className="grid gap-2">
      <h2 className="text-[15px] font-semibold">Pour comparer d&apos;une fois sur l&apos;autre</h2>
      <ul className="grid list-disc gap-1 pl-5 text-[14px] text-muted">
        <li>Toujours du même côté (le droit, par exemple) et au même endroit.</li>
        <li>Mètre ruban à plat, sans serrer, muscle relâché.</li>
        <li>De préférence le matin, avant de manger ou de t&apos;entraîner.</li>
      </ul>
    </Card>
  );
}
