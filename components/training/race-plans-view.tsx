import { FlagCheckeredIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatLongDate } from "@/lib/dates";
import { daysUntil, paceOf, predictRace, racePassages, weeklyDistance, type Outing } from "@/lib/engine";
import { formatCountdown, raceDistanceLabel, type RacePlan } from "@/lib/races";
import { formatDistance, formatDuration, formatKm, formatPace, recordLabel } from "@/lib/sports";

/**
 * Objectifs de course : pour chaque course à venir, le temps qu'il reste, l'allure
 * du temps visé, les passages, et ce que les sorties récentes laissent prévoir.
 */
export function RacePlansView({
  plans,
  outings,
  today,
  addHref,
  editHref,
}: {
  plans: RacePlan[];
  outings: Outing[];
  today: string;
  addHref: string;
  editHref: (id: string) => string;
}) {
  if (plans.length === 0) {
    return (
      <div className="grid gap-4 md:max-w-xl">
        <EmptyState icon={<FlagCheckeredIcon size={22} />} title="Aucune course prévue">
          Pose une course à pied avec sa date et sa distance. Avec un temps visé, tu verras l&apos;allure à tenir, les temps de passage, et ce que tes sorties
          récentes laissent prévoir.
        </EmptyState>
        <Link href={addHref} className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
          <PlusIcon size={20} weight="bold" aria-hidden="true" /> Ajouter une course
        </Link>
      </div>
    );
  }

  const upcoming = plans.filter((p) => p.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = plans.filter((p) => p.date < today).sort((a, b) => b.date.localeCompare(a.date));
  // Quatre dernières semaines complètes : la semaine en cours ne compte pas.
  const weeks = weeklyDistance(outings, "course", today, 5).slice(0, -1);
  const weeklyMeters = weeks.reduce((sum, w) => sum + w.meters, 0) / weeks.length;

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {upcoming.map((plan) => (
          <PlanCard key={plan.id} plan={plan} outings={outings} today={today} editHref={editHref(plan.id)} />
        ))}
        {upcoming.length === 0 ? (
          <Card className="grid content-start gap-2">
            <h2 className="text-lg font-semibold">Aucune course à venir</h2>
            <p className="text-[15px] text-muted">Tes courses passées sont plus bas.</p>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-3 md:max-w-xl">
        <Link href={addHref} className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
          <PlusIcon size={20} weight="bold" aria-hidden="true" /> Ajouter une course
        </Link>
        <p className="text-[14px] text-muted">
          {weeklyMeters > 0 ? `Tu cours ${formatKm(weeklyMeters)} par semaine en moyenne sur les quatre dernières semaines complètes. ` : ""}
          Le temps prévu vient de la formule de Riegel, appliquée à tes sorties de course d&apos;au moins 3 km des douze dernières semaines. Une sortie
          d&apos;entraînement n&apos;est pas une course : c&apos;est un ordre de grandeur, souvent prudent. Fonte ne propose pas de plan d&apos;entraînement ; en
          cas de douleur ou de doute sur ta santé, demande l&apos;avis d&apos;un médecin.
        </p>
      </div>

      {past.length ? (
        <section aria-labelledby="courses-passees-titre" className="grid gap-2 md:max-w-xl">
          <h2 id="courses-passees-titre" className="label-caps">
            Courses passées
          </h2>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {past.map((p) => (
              <li key={p.id}>
                <Link href={editHref(p.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.name}</span>
                    <span className="block text-[13px] text-muted">
                      {formatLongDate(p.date)} · {raceDistanceLabel(p.distanceM)}
                    </span>
                  </span>
                  {p.targetSeconds ? <span className="font-numeric shrink-0 text-[20px]">{formatDuration(p.targetSeconds)}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PlanCard({ plan, outings, today, editHref }: { plan: RacePlan; outings: Outing[]; today: string; editHref: string }) {
  const titleId = `course-${plan.id}-titre`;
  const prediction = predictRace(outings, plan.distanceM, today);
  const pace = plan.targetSeconds ? paceOf("course", plan.distanceM, plan.targetSeconds) : null;
  const gap = prediction && plan.targetSeconds ? prediction.seconds - plan.targetSeconds : null;
  const passages = plan.targetSeconds ? racePassages(plan.targetSeconds, plan.distanceM) : [];

  return (
    <Card aria-labelledby={titleId} className="grid content-start gap-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {plan.name}
          </h2>
          <p className="text-[14px] text-muted">
            {formatLongDate(plan.date)}, {formatCountdown(daysUntil(today, plan.date))} · {raceDistanceLabel(plan.distanceM)}
          </p>
        </div>
        <Link href={editHref} className={buttonClasses("secondary", "md", "shrink-0")}>
          <PencilSimpleIcon size={18} aria-hidden="true" /> Corriger
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[13px] text-muted">Temps visé</dt>
          <dd>
            {plan.targetSeconds ? (
              <>
                <span className="font-numeric block text-[28px] leading-tight">{formatDuration(plan.targetSeconds)}</span>
                {pace ? <span className="block text-[13px] text-muted">{formatPace(pace)}</span> : null}
              </>
            ) : (
              <span className="text-[15px] text-muted">Pas encore choisi</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Prévu d&apos;après tes sorties</dt>
          <dd>
            {prediction ? (
              <>
                <span className="font-numeric block text-[28px] leading-tight">{formatDuration(prediction.seconds)}</span>
                <span className="block text-[13px] text-muted">
                  {formatDistance(prediction.outing.distanceM!, "course")} en {formatDuration(prediction.outing.seconds)}, {formatLongDate(prediction.outing.date)}
                </span>
              </>
            ) : (
              <span className="text-[15px] text-muted">Il faut une sortie de 3 km ou plus, avec sa distance, dans les douze dernières semaines.</span>
            )}
          </dd>
        </div>
      </dl>

      {gap !== null ? (
        <p className="text-[15px]">
          {gap <= 0
            ? `Tes sorties récentes laissent prévoir ce temps${gap < 0 ? `, avec ${formatDuration(-gap)} de marge` : ""}.`
            : `Il reste ${formatDuration(gap)} à gagner d'ici la course.`}
        </p>
      ) : null}

      {passages.length > 1 ? (
        <table className="w-full text-left text-[15px]">
          <caption className="pb-1 text-left text-[13px] text-muted">Temps de passage à allure régulière</caption>
          <tbody className="divide-y divide-line">
            {passages.map((p) => (
              <tr key={p.meters}>
                <th scope="row" className="py-1.5 font-normal text-muted">
                  {p.meters === plan.distanceM ? "Arrivée" : recordLabel(p.meters, "course")}
                </th>
                <td className="font-numeric py-1.5 text-right text-[18px]">{formatDuration(p.seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Card>
  );
}
