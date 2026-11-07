import { ArrowsClockwiseIcon, CalendarCheckIcon, FlagIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart, LineLegend } from "@/components/charts/line-chart";
import { MuscleVolume } from "@/components/training/muscle-volume";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatAxisDate } from "@/lib/charts";
import { addDays, formatShortDate } from "@/lib/dates";
import { kgTo, type Projection, type WeightUnit } from "@/lib/engine";
import { planLabel } from "@/lib/program";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, formatWeight, type Equipment, type Muscle } from "@/lib/training";

export type ProgramSessionView = { id: string; name: string; items: { id: string; name: string; sets: number; repMin: number | null; repMax: number | null }[] };

export type ProgramViewData = {
  id: string;
  name: string;
  startsOn: string;
  weeks: number;
  deloadEvery: number;
  sessionMinutes: number;
  equipment: Equipment[];
  priority: Muscle[];
  /** Semaine du programme en cours (1 la première) et si c'est une semaine de décharge. */
  week: number;
  deload: boolean;
  today: string;
  next: { session: ProgramSessionView; suggestions: Record<string, string> } | null;
  sessions: ProgramSessionView[];
  planned: Record<string, number>;
  goal: { exerciseName: string; kg: number; date: string | null; history: { date: string; e1rm: number }[]; projection: Projection | null } | null;
};

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const longDate = (date: string) => dayMonth.format(new Date(`${date}T00:00:00Z`));

/** Écran Programme : semaine en cours, prochaine séance, objectif, séances, volume prévu, réglages. */
export function ProgramView({
  data,
  unit,
  startAction,
  endAction,
}: {
  data: ProgramViewData;
  unit: WeightUnit;
  startAction: (formData: FormData) => void | Promise<void>;
  endAction: () => void | Promise<void>;
}) {
  const over = data.week > data.weeks;
  const nextDeload = Math.ceil(data.week / data.deloadEvery) * data.deloadEvery;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
      <div className="grid content-start gap-4">
        <Card aria-labelledby="semaine-titre" className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="semaine-titre" className="font-title text-[26px]">
              {over ? "Programme terminé" : `Semaine ${data.week}`}
              {over ? null : <span className="font-sans text-[15px] font-normal text-muted"> sur {data.weeks}</span>}
            </h2>
            {data.deload && !over ? <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[13px] font-medium text-text">Décharge</span> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(data.week / data.weeks, 1) * 100}%` }} />
          </div>
          <p className="text-[14px] text-muted">
            {over
              ? `Les ${data.weeks} semaines sont passées. Continue avec ces séances ou crée un nouveau programme d'après ta forme du moment.`
              : data.deload
                ? "Semaine de décharge : moins de séries et des charges allégées d'environ 10 %, pour récupérer et repartir plus fort."
                : nextDeload <= data.weeks
                  ? `Prochaine semaine de décharge : la ${nextDeload}e.`
                  : "Plus de semaine de décharge d'ici la fin du programme."}
          </p>
        </Card>

        {data.next ? (
          <Card aria-labelledby="prochaine-titre" className="grid gap-4 border-accent-text/60">
            <div className="grid gap-1">
              <p className="label-caps">Prochaine séance</p>
              <h2 id="prochaine-titre" className="font-title text-[26px]">
                {data.next.session.name}
              </h2>
            </div>
            <ul className="grid divide-y divide-line">
              {data.next.session.items.map((item) => (
                <li key={item.id} className="grid gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] font-medium">{item.name}</span>
                    <span className="shrink-0 text-[14px] text-muted tabular-nums">{planLabel(item.sets, item.repMin, item.repMax)}</span>
                  </span>
                  <span className="text-[13px] text-muted">{data.next!.suggestions[item.id] ?? "Première fois : tes valeurs serviront de référence."}</span>
                </li>
              ))}
            </ul>
            <form action={startAction}>
              <input type="hidden" name="templateId" value={data.next.session.id} />
              <SubmitButton size="lg" className="w-full" pendingLabel="Démarrage…">
                Démarrer
              </SubmitButton>
            </form>
            <p className="text-[13px] text-muted">
              Une séance ratée ne décale rien : la suivante reprend dans l&apos;ordre. La charge suggérée est un repère ; en cas de douleur, arrête et parles-en à
              un professionnel de santé.
            </p>
          </Card>
        ) : null}

        {data.goal ? <GoalCard goal={data.goal} today={data.today} unit={unit} /> : null}

        <section aria-labelledby="seances-titre" id="seances" className="grid scroll-mt-4 gap-3">
          <h2 id="seances-titre" className="text-lg font-semibold">
            Séances de la semaine
          </h2>
          <ul className="grid gap-3">
            {data.sessions.map((s) => (
              <li key={s.id}>
                <Card className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-title text-[22px]">{s.name}</h3>
                    <Link href={`/entrainement/modeles/${s.id}`} className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                      Modifier
                    </Link>
                  </div>
                  <ul className="grid">
                    {s.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 py-1 text-[15px]">{item.name}</span>
                        <span className="shrink-0 text-[14px] text-muted tabular-nums">{planLabel(item.sets, item.repMin, item.repMax)}</span>
                        <Link
                          href={`/entrainement/programme/remplacer/${item.id}`}
                          aria-label={`Remplacer ${item.name}`}
                          title="Remplacer"
                          className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
                        >
                          <ArrowsClockwiseIcon size={18} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid content-start gap-4">
        <Card aria-labelledby="prevu-titre" className="grid gap-4">
          <div>
            <h2 id="prevu-titre" className="text-lg font-semibold">
              Volume prévu par semaine
            </h2>
            <p className="text-[13px] text-muted">Séries du programme hors décharge, par muscle.</p>
          </div>
          <MuscleVolume perMuscle={data.planned} planned />
        </Card>

        <Card aria-labelledby="reglages-titre" className="grid gap-3">
          <h2 id="reglages-titre" className="text-lg font-semibold">
            Réglages
          </h2>
          <dl className="grid gap-2 text-[15px]">
            <Setting label="Répartition" value={data.name} />
            <Setting label="Durée" value={`${data.sessionMinutes} min par séance, ${data.weeks} semaines`} />
            <Setting label="Début" value={longDate(data.startsOn)} />
            <Setting label="Décharge" value={`toutes les ${data.deloadEvery} semaines`} />
            <Setting label="Matériel" value={data.equipment.map((e) => EQUIPMENT_LABELS[e]).join(", ")} />
            <Setting label="Priorités" value={data.priority.length ? data.priority.map((m) => MUSCLE_LABELS[m]).join(", ") : "aucune"} />
          </dl>
          <p className="text-[13px] text-muted">
            Pour changer ces réglages, termine le programme et crée-en un autre. Ses séances restent dans tes modèles, ton historique ne bouge pas.
          </p>
          <ConfirmAction
            action={endAction}
            label="Terminer le programme"
            confirmLabel="Terminer"
            question="Terminer ce programme ? Ses séances restent dans tes modèles, sans charge suggérée."
          />
        </Card>
      </div>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Objectif chiffré : 1RM estimé réel, projection en pointillés, valeur visée en repère. */
function GoalCard({ goal, today, unit }: { goal: NonNullable<ProgramViewData["goal"]>; today: string; unit: WeightUnit }) {
  const p = goal.projection;
  const kg = (v: number) => `${formatWeight(v, unit)}\u00a0${unit}`;
  const axis = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  const from = addDays(today, -42);
  const real = goal.history.filter((h) => h.date >= from && h.date <= today);
  // La projection s'arrête deux semaines après l'objectif atteint ou la date visée, à un an au plus.
  const limit = addDays(today, 365);
  const ends = [p?.reachedOn ? addDays(p.reachedOn, 14) : limit, goal.date ? addDays(goal.date, 14) : ""].sort();
  const end = ends[1] < limit ? ends[1] : limit;
  const line = p ? p.points.filter((pt) => pt.date <= end) : [];
  const to = line.at(-1)?.date ?? today;

  return (
    <Card aria-labelledby="objectif-titre" className="grid gap-4">
      <div className="grid gap-1">
        <p className="label-caps flex items-center gap-1.5">
          <FlagIcon size={14} weight="fill" aria-hidden="true" /> Objectif
        </p>
        <h2 id="objectif-titre" className="font-title text-[26px]">
          {goal.exerciseName} à {kg(goal.kg)}
        </h2>
        {goal.date ? <p className="text-[14px] text-muted">Pour le {longDate(goal.date)}</p> : null}
      </div>

      {p ? (
        <figure className="grid gap-3">
          <figcaption className="grid gap-1 text-[15px]">
            <span>
              1RM estimé actuel : <span className="font-numeric text-[22px]">{kg(p.current)}</span>
            </span>
            <span className="text-muted">{projectionSummary(p, goal, unit)}</span>
          </figcaption>
          <LineChart
            points={real.map((h) => ({ date: h.date, value: kgTo(unit, h.e1rm) }))}
            line={line.map((pt) => ({ date: pt.date, value: kgTo(unit, pt.value) }))}
            dashed
            goal={kgTo(unit, goal.kg)}
            from={real[0]?.date && real[0].date < today ? real[0].date : addDays(today, -7)}
            to={to}
            format={(v) => axis.format(v)}
          />
          <LineLegend points="1RM estimé de chaque séance" line="Projection" dashed goal="Objectif" />
          <ChartTable
            caption={`1RM estimé et projection, ${goal.exerciseName}`}
            headers={["Date", "1RM estimé", "Projection"]}
            rows={[
              ...real.map((h, i) => ({ key: `r${i}`, cells: [formatAxisDate(h.date), kg(h.e1rm), ""] })),
              ...line.filter((_, i) => i > 0 && i % 4 === 0).map((pt) => ({ key: `p${pt.date}`, cells: [formatAxisDate(pt.date), "", kg(pt.value)] })),
            ]}
          />
          <p className="text-[13px] text-muted">
            {p.source === "mesure"
              ? `Rythme mesuré sur tes 6 dernières semaines : ${kg(p.weeklyGain)} de plus par semaine.`
              : `Pas encore assez de séances récentes pour mesurer ton rythme : repère de ${kg(p.weeklyGain)} par semaine selon ton niveau.`}{" "}
            À plat les semaines de décharge. Une projection, pas une promesse : la progression ralentit en approchant de tes limites.
          </p>
        </figure>
      ) : (
        <p className="flex items-start gap-2 text-[15px] text-muted">
          <CalendarCheckIcon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          Fais une première séance avec cet exercice, entre 1 et 12 reps : la projection partira de ton 1RM estimé.
        </p>
      )}
    </Card>
  );
}

function projectionSummary(p: Projection, goal: NonNullable<ProgramViewData["goal"]>, unit: WeightUnit): string {
  const kg = `${formatWeight(goal.kg, unit)} ${unit}`;
  if (p.reachedOn !== null && p.reachedOn === p.points[0].date) return `Objectif atteint : tu dépasses ${kg}. Bravo, il est temps d'en viser un autre.`;
  if (p.reachedOn === null) return `À ce rythme, ${kg} est à plus de deux ans. Un objectif intermédiaire serait plus motivant.`;
  const when = `À ce rythme, ${kg} vers le ${formatShortDate(p.reachedOn)}`;
  if (!goal.date) return `${when}.`;
  return p.reachedOn <= goal.date ? `${when}, avant ta date visée.` : `${when}, après ta date visée : garde le cap ou décale la date.`;
}
