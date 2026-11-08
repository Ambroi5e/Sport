import { PlusIcon, SneakerMoveIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatLongDate, weekStart } from "@/lib/dates";
import type { Activity } from "@/app/(app)/entrainement/sports/data";
import { activityName, formatKcal, formatMinutes, INTENSITY_LABELS } from "@/lib/sports";
import { SportIcon } from "./sport-icon";

/** Sports notés : la semaine en cours en un coup d'œil, puis les dernières activités. */
export function ActivitiesView({ activities, today, addHref, itemHref }: { activities: Activity[]; today: string; addHref: string; itemHref: (id: string) => string }) {
  const monday = weekStart(today);
  const week = activities.filter((a) => a.date >= monday);
  const minutes = week.reduce((sum, a) => sum + a.minutes, 0);
  const known = week.filter((a) => a.kcal !== null);
  const kcal = known.reduce((sum, a) => sum + a.kcal!, 0);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
      <div className="grid content-start gap-4">
        <Card aria-labelledby="semaine-sports-titre" className="grid gap-3">
          <h2 id="semaine-sports-titre" className="text-lg font-semibold">
            Cette semaine
          </h2>
          {week.length ? (
            <>
              <p className="text-[15px] text-muted">
                <span className="font-numeric text-[28px] text-text">{week.length}</span> activité{week.length > 1 ? "s" : ""}, {formatMinutes(minutes)}
              </p>
              {known.length ? (
                <p className="text-[14px] text-muted">
                  Dépense estimée : {formatKcal(kcal)}
                  {known.length < week.length ? " (sans les activités d'avant ta première pesée)" : ""}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[15px] text-muted">Aucun sport noté depuis lundi.</p>
          )}
          <Link href={addHref} className={buttonClasses("primary", "lg", "w-full")}>
            <PlusIcon size={20} weight="bold" aria-hidden="true" /> Noter un sport
          </Link>
        </Card>
        <p className="text-[13px] text-muted">
          Dépense estimée avec les MET du Compendium des activités physiques (2024) et ta pesée la plus proche : un ordre de grandeur, qui ne change pas tes cibles
          de calories.
        </p>
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={<SneakerMoveIcon size={22} />} title="Aucun sport noté">
          Padel, foot, tennis, escalade… Note tes matchs et tes séances en trois taps : ils apparaissent dans ta semaine, avec leur dépense estimée.
        </EmptyState>
      ) : (
        <section aria-labelledby="dernieres-activites-titre" className="grid content-start gap-2">
          <h2 id="dernieres-activites-titre" className="label-caps">
            Dernières activités
          </h2>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {activities.map((a) => (
              <li key={a.id}>
                <Link href={itemHref(a.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text">
                    <SportIcon sport={a.sport} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{activityName(a.sport, a.label)}</span>
                    <span className="block text-[13px] text-muted">
                      {formatLongDate(a.date)} · {INTENSITY_LABELS[a.intensity].label.toLowerCase()}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-numeric block text-[20px]">{formatMinutes(a.minutes)}</span>
                    {a.kcal !== null ? <span className="block text-[12px] text-muted">≈ {new Intl.NumberFormat("fr-FR").format(a.kcal)} kcal</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
