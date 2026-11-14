import { LightningIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { formatLongDate } from "@/lib/dates";
import { HYROX_ROUNDS, HYROX_STATIONS, hyroxBests, hyroxDeltas, hyroxSummary, type HyroxRace } from "@/lib/engine";
import { formatDelta, STATION_LABELS } from "@/lib/hyrox";
import { formatDuration } from "@/lib/sports";

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/**
 * Hyrox : la course choisie (la dernière par défaut) découpée en course, ateliers
 * et transitions, ses seize temps comparés à la course d'avant, puis toutes les courses.
 */
export function HyroxView({
  races,
  selectedId,
  addHref,
  raceHref,
  editHref,
}: {
  /** La plus récente en premier. */
  races: HyroxRace[];
  selectedId?: string;
  addHref: string;
  raceHref: (id: string) => string;
  editHref: (id: string) => string;
}) {
  if (races.length === 0) {
    return (
      <div className="grid gap-4 md:max-w-xl">
        <EmptyState icon={<LightningIcon size={22} />} title="Aucune course Hyrox notée">
          Note une course ou une simulation avec ses temps : huit courses de 1 km, huit ateliers. Tu verras où le temps part, et ce qui change d&apos;une fois sur
          l&apos;autre.
        </EmptyState>
        <Link href={addHref} className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
          <PlusIcon size={20} weight="bold" aria-hidden="true" /> Noter une course Hyrox
        </Link>
      </div>
    );
  }

  const index = Math.max(0, races.findIndex((r) => r.id === selectedId));
  const race = races[index];
  // La course d'avant qui a des temps : c'est à elle qu'on se compare.
  const previous = races.slice(index + 1).find((r) => r.splits) ?? null;
  const summary = hyroxSummary(race.splits, race.seconds);
  const deltas = hyroxDeltas(race.splits, previous?.splits ?? null);
  const { bests, idealSeconds } = hyroxBests(races);
  const timed = races.filter((r) => r.splits).length;
  const parts =
    summary.runSeconds !== null && summary.stationSeconds !== null && summary.transitionSeconds !== null
      ? [
          { label: "Course", seconds: summary.runSeconds, bar: "bg-accent" },
          { label: "Ateliers", seconds: summary.stationSeconds, bar: "bg-text" },
          { label: "Transitions", seconds: summary.transitionSeconds, bar: "bg-muted" },
        ]
      : null;
  const totalDelta = previous ? race.seconds - previous.seconds : null;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
      <Card aria-labelledby="hyrox-course-titre" className="grid content-start gap-3 md:col-start-1 md:row-start-1">
          <div>
            <h2 id="hyrox-course-titre" className="text-lg font-semibold">
              {index === 0 ? "Dernière course" : "Course"}
            </h2>
            <p className="text-[14px] text-muted">{formatLongDate(race.date)}</p>
          </div>
          <p className="text-[15px] text-muted">
            <span className="font-numeric text-[40px] leading-none text-text">{formatDuration(race.seconds)}</span>
            {totalDelta !== null ? <span className="ml-2">{formatDelta(totalDelta)} depuis la course d&apos;avant</span> : null}
          </p>
          {parts ? (
            <>
              <div className="flex h-3 gap-0.5" aria-hidden="true">
                {parts.map((p) => (
                  <span key={p.label} className={cn("rounded-inner", p.bar)} style={{ flexGrow: p.seconds, flexBasis: 0, minWidth: 4 }} />
                ))}
              </div>
              <dl className="grid grid-cols-3 gap-2">
                {parts.map((p) => (
                  <div key={p.label}>
                    <dt className="flex items-center gap-1.5 text-[13px] text-muted">
                      <span className={cn("size-2 shrink-0 rounded-full", p.bar)} aria-hidden="true" />
                      {p.label}
                    </dt>
                    <dd>
                      <span className="font-numeric block text-[20px]">{formatDuration(p.seconds)}</span>
                      <span className="block text-[12px] text-muted">{percent.format(p.seconds / race.seconds)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : race.splits ? (
            <p className="text-[14px] text-muted">
              {summary.runSeconds !== null ? `Course : ${formatDuration(summary.runSeconds)}. ` : ""}
              {summary.stationSeconds !== null ? `Ateliers : ${formatDuration(summary.stationSeconds)}. ` : ""}
              Note les seize temps pour voir la part des transitions.
            </p>
          ) : (
            <p className="text-[14px] text-muted">Aucun temps par tour pour cette course. Ajoute-les pour voir où le temps part.</p>
          )}
          {summary.runFade !== null ? (
            <p className="text-[14px] text-muted">
              {summary.runFade > 0
                ? `Tes quatre dernières courses sont ${formatDuration(summary.runFade)} plus lentes au kilomètre que les quatre premières.`
                : summary.runFade < 0
                  ? `Tes quatre dernières courses sont ${formatDuration(-summary.runFade)} plus rapides au kilomètre que les quatre premières.`
                  : "Tu tiens la même allure de course du début à la fin."}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
            <Link href={addHref} className={buttonClasses("primary", "lg", "w-full")}>
              <PlusIcon size={20} weight="bold" aria-hidden="true" /> Noter une course
            </Link>
            <Link href={editHref(race.id)} className={buttonClasses("secondary", "lg", "w-full")}>
              <PencilSimpleIcon size={20} aria-hidden="true" /> Corriger
            </Link>
          </div>
        </Card>

      <div className="order-last grid content-start gap-4 md:order-none md:col-start-1 md:row-start-2">
        {idealSeconds !== null && timed > 1 ? (
          <Card aria-labelledby="hyrox-ideal-titre" className="grid gap-2">
            <h2 id="hyrox-ideal-titre" className="text-lg font-semibold">
              Tes meilleurs segments bout à bout
            </h2>
            <p className="font-numeric text-[28px] leading-none">{formatDuration(idealSeconds)}</p>
            <p className="text-[13px] text-muted">La somme de ton meilleur temps sur chaque course et chaque atelier, sans les transitions. Un repère, pas une promesse.</p>
          </Card>
        ) : null}

        <section aria-labelledby="hyrox-courses-titre" className="grid gap-2">
          <h2 id="hyrox-courses-titre" className="label-caps">
            Toutes les courses
          </h2>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {races.map((r) => (
              <li key={r.id}>
                <Link
                  href={raceHref(r.id)}
                  scroll={false}
                  aria-current={r.id === race.id ? "true" : undefined}
                  className={cn("flex items-center gap-3 px-4 py-3 hover:bg-surface-2", r.id === race.id && "bg-surface-2")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{formatLongDate(r.date)}</span>
                    <span className="block text-[13px] text-muted">{r.splits ? "Avec les temps par tour" : "Temps total seul"}</span>
                  </span>
                  <span className="font-numeric shrink-0 text-[20px]">{formatDuration(r.seconds)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Card aria-labelledby="hyrox-tours-titre" className="grid content-start gap-3 md:col-start-2 md:row-span-2 md:row-start-1">
        <div>
          <h2 id="hyrox-tours-titre" className="text-lg font-semibold">
            Tour par tour
          </h2>
          {previous ? <p className="text-[14px] text-muted">Écarts avec la course du {formatLongDate(previous.date)}.</p> : null}
        </div>
        {race.splits ? (
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Temps de chaque course et de chaque atelier, tour par tour</caption>
            <thead>
              <tr className="text-[13px] text-muted">
                <th scope="col" className="w-8 py-1.5 font-medium">
                  <span className="sr-only">Tour</span>
                </th>
                <th scope="col" className="py-1.5 font-medium">
                  Course 1 km
                </th>
                <th scope="col" className="py-1.5 font-medium">
                  Atelier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Array.from({ length: HYROX_ROUNDS }, (_, r) => (
                <tr key={r} className="align-top">
                  <th scope="row" className="font-numeric py-2.5 text-[15px] font-normal text-muted">
                    {r + 1}
                  </th>
                  <td className="py-2.5 pr-2">
                    <Split seconds={race.splits![r * 2]} delta={deltas[r * 2]} record={timed > 1 && bests[r * 2]?.raceId === race.id} />
                  </td>
                  <td className="py-2.5">
                    <span className="block text-[13px] text-muted">{STATION_LABELS[HYROX_STATIONS[r]].label}</span>
                    <Split seconds={race.splits![r * 2 + 1]} delta={deltas[r * 2 + 1]} record={timed > 1 && bests[r * 2 + 1]?.raceId === race.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[15px] text-muted">Cette course n&apos;a que son temps total.</p>
        )}
        {race.splits && timed > 1 ? <p className="text-[13px] text-muted">« Record » : ton meilleur temps sur ce segment, toutes courses confondues.</p> : null}
      </Card>
    </div>
  );
}

function Split({ seconds, delta, record }: { seconds: number | null; delta: number | null; record: boolean }) {
  if (seconds === null) return <span className="text-muted">Non noté</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-numeric text-[20px]">{formatDuration(seconds)}</span>
      {delta !== null ? <span className="text-[13px] text-muted">{formatDelta(delta)}</span> : null}
      {record ? <span className="text-[12px] font-medium text-accent-text">Record</span> : null}
    </span>
  );
}
