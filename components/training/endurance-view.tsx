import { PersonSimpleRunIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartTable } from "@/components/charts/chart-table";
import { LinkChips } from "@/components/progress/progress-tabs";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAxisDate } from "@/lib/charts";
import { formatLongDate } from "@/lib/dates";
import { ENDURANCE_SPORTS, enduranceRecords, paceOf, weeklyDistance, type EnduranceSport, type Outing } from "@/lib/engine";
import { distanceUnit, formatDistance, formatDuration, formatKm, formatPace, recordLabel, SPORT_LABELS } from "@/lib/sports";

const axisFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function outingsText(n: number) {
  return `${n} sortie${n > 1 ? "s" : ""}`;
}

/**
 * Endurance d'un sport : la semaine en cours, les kilomètres des huit dernières
 * semaines et les records. Seuls les sports déjà pratiqués sont proposés.
 */
export function EnduranceView({
  outings,
  sport,
  today,
  addHref,
  sportHref,
  outingHref,
  links = [],
}: {
  outings: Outing[];
  sport: EnduranceSport;
  today: string;
  addHref: string;
  sportHref: (sport: EnduranceSport) => string;
  outingHref: (id: string) => string;
  /** Liens vers les objectifs de course et les zones cardiaques. */
  links?: { href: string; label: string }[];
}) {
  const practiced = ENDURANCE_SPORTS.filter((s) => outings.some((o) => o.sport === s));
  if (practiced.length === 0) {
    return (
      <div className="grid gap-4 md:max-w-xl">
        <EmptyState icon={<PersonSimpleRunIcon size={22} />} title="Aucune sortie notée">
          Course, trail, vélo, natation, rameur ou marche : note une sortie avec sa distance, et tu verras ici ton allure, tes kilomètres par semaine et tes records.
        </EmptyState>
        <Link href={addHref} className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
          <PlusIcon size={20} weight="bold" aria-hidden="true" /> Noter une sortie
        </Link>
        {links.length ? (
          <nav aria-label="Aller plus loin" className="grid gap-2 sm:grid-cols-2 sm:justify-self-start">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={buttonClasses("secondary", "md", "w-full")}>
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    );
  }

  const weeks = weeklyDistance(outings, sport, today);
  const current = weeks[weeks.length - 1];
  const previous = weeks.slice(0, -1);
  const average = previous.reduce((sum, w) => sum + w.meters, 0) / previous.length;
  const records = enduranceRecords(outings, sport);
  const weekPace = paceOf(sport, current.meters, current.seconds);
  const measured = outings.some((o) => o.sport === sport && o.distanceM);
  const distance = (meters: number) => (distanceUnit(sport) === "m" ? formatDistance(meters, sport) : formatKm(meters));

  return (
    <div className="grid gap-4 md:gap-6">
      {practiced.length > 1 ? <LinkChips label="Sport" items={practiced.map((s) => ({ href: sportHref(s), label: SPORT_LABELS[s], current: s === sport }))} /> : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
        <div className="grid content-start gap-4">
          <Card aria-labelledby="endurance-semaine-titre" className="grid gap-3">
            <h2 id="endurance-semaine-titre" className="text-lg font-semibold">
              Cette semaine
            </h2>
            {current.outings ? (
              <>
                <p className="text-[15px] text-muted">
                  <span className="font-numeric text-[32px] leading-none text-text">{distance(current.meters)}</span>
                </p>
                <p className="text-[15px] text-muted">
                  {outingsText(current.outings)}, {formatDuration(current.seconds)}
                  {weekPace ? `, ${formatPace(weekPace)} en moyenne` : ""}.
                </p>
              </>
            ) : (
              <p className="text-[15px] text-muted">Aucune sortie depuis lundi.</p>
            )}
            <Link href={addHref} className={buttonClasses("primary", "lg", "w-full")}>
              <PlusIcon size={20} weight="bold" aria-hidden="true" /> Noter une sortie
            </Link>
          </Card>

          <Card aria-labelledby="endurance-records-titre" className="grid gap-3">
            <h2 id="endurance-records-titre" className="text-lg font-semibold">
              Records
            </h2>
            {records.longest ? (
              <>
                <ul className="grid divide-y divide-line">
                  <RecordRow label="Plus longue sortie" value={formatDistance(records.longest.distanceM!, sport)} outing={records.longest} href={outingHref} />
                  {records.paces.map((p) => (
                    <RecordRow
                      key={p.meters}
                      label={`Meilleure allure, ${recordLabel(p.meters, sport)} et plus`}
                      value={formatPace(p.pace)}
                      detail={formatDistance(p.outing.distanceM!, sport)}
                      outing={p.outing}
                      href={outingHref}
                    />
                  ))}
                  {records.climb ? (
                    <RecordRow label="Plus gros dénivelé" value={`${new Intl.NumberFormat("fr-FR").format(records.climb.elevationM!)} m`} outing={records.climb} href={outingHref} />
                  ) : null}
                </ul>
                <p className="text-[13px] text-muted">
                  Une allure record est celle d&apos;une sortie entière, pas un temps sur la distance exacte : Fonte n&apos;a pas le détail kilomètre par kilomètre.
                </p>
              </>
            ) : (
              <p className="text-[15px] text-muted">Note la distance d&apos;une sortie pour voir tes records.</p>
            )}
          </Card>
          {links.length ? (
          <nav aria-label="Aller plus loin" className="grid gap-2 sm:grid-cols-2 sm:justify-self-start">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={buttonClasses("secondary", "md", "w-full")}>
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
        </div>

        <Card aria-labelledby="endurance-volume-titre" className="grid content-start gap-3">
          <h2 id="endurance-volume-titre" className="text-lg font-semibold">
            {distanceUnit(sport) === "m" ? "Distance par semaine" : "Kilomètres par semaine"}
          </h2>
          {measured ? (
            <figure className="grid gap-3">
              <BarChart
                format={(v) => axisFormat.format(v)}
                labelKey={current.weekStart}
                bars={weeks.map((w, i) => {
                  const [, m, d] = w.weekStart.split("-");
                  return {
                    key: w.weekStart,
                    label: `${Number(d)}/${Number(m)}`,
                    value: distanceUnit(sport) === "m" ? w.meters : Math.round(w.meters / 100) / 10,
                    title: `Semaine du ${formatAxisDate(w.weekStart)} : ${distance(w.meters)}, ${outingsText(w.outings)}`,
                    partial: i === weeks.length - 1,
                  };
                })}
              />
              <figcaption className="text-[14px] text-muted">
                Cette semaine (en cours) : {distance(current.meters)}. Moyenne des {previous.length} semaines précédentes : {distance(average)}.
              </figcaption>
              <ChartTable
                caption={`${SPORT_LABELS[sport]} : distance par semaine`}
                headers={["Semaine du", "Sorties", "Durée", "Distance"]}
                rows={[...weeks].reverse().map((w) => ({ key: w.weekStart, cells: [formatAxisDate(w.weekStart), w.outings, w.seconds ? formatDuration(w.seconds) : "0", distance(w.meters)] }))}
              />
            </figure>
          ) : (
            <p className="text-[15px] text-muted">Aucune sortie avec une distance pour l&apos;instant.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecordRow({ label, value, detail, outing, href }: { label: string; value: string; detail?: string; outing: Outing; href: (id: string) => string }) {
  return (
    <li>
      <Link href={href(outing.id)} className="flex items-center gap-3 py-2.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">{label}</span>
          <span className="block text-[13px] text-muted">
            {formatLongDate(outing.date)}
            {detail ? ` · ${detail}` : ""}
          </span>
        </span>
        <span className="font-numeric shrink-0 text-[20px]">{value}</span>
      </Link>
    </li>
  );
}
