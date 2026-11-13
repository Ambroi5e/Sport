import { BatteryHighIcon, BatteryLowIcon, BatteryMediumIcon, CalendarCheckIcon, CheckIcon, PushPinIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { nextPlanned, type PlanDay, type ReadinessLevel, type TodayOptions, type TrainingLoad, type WeekPlan, type WeeklySport } from "@/lib/engine";
import { adviceText, capitalize, conflictText, dayWord, loadSummary, sportName, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/planning";
import { HEALTH_REMINDER, LEVEL_LABELS } from "@/lib/readiness";
import { formatMinutes, INTENSITY_LABELS, isSport } from "@/lib/sports";
import { SportIcon } from "./sport-icon";

type FormAction = (formData: FormData) => void | Promise<void>;
type Action = () => void | Promise<void>;

export type WeekPlanData = {
  today: string;
  plan: WeekPlan;
  /** La séance prévue aujourd'hui et ce qu'on peut en faire ; null sans séance prévue. */
  options: TodayOptions | null;
  load: TrainingLoad;
  availableDays: readonly number[];
  weeklySports: readonly WeeklySport[];
  hasProgram: boolean;
  /** Séance commencée et pas terminée. */
  active: { id: string; name: string } | null;
};

export type WeekPlanActions = {
  start: FormAction;
  /** Pose une séance sur le jour envoyé dans `date`. */
  move: (sessionId: string) => FormAction;
  postpone: (sessionId: string) => Action;
  free: (date: string) => Action;
};

const LEVEL_STYLE: Record<ReadinessLevel, { icon: ReactNode; className: string }> = {
  bonne: { icon: <BatteryHighIcon size={18} weight="bold" aria-hidden="true" />, className: "text-success" },
  moyenne: { icon: <BatteryMediumIcon size={18} weight="bold" aria-hidden="true" />, className: "text-warning" },
  basse: { icon: <BatteryLowIcon size={18} weight="bold" aria-hidden="true" />, className: "text-danger" },
};

const dayNumber = (date: string) => Number(date.slice(8));

/**
 * Ma semaine : la séance du jour et son adaptation à la forme, puis les sept jours
 * (séances faites, prévues, ratées, sports), la charge récente et la semaine type.
 */
export function WeekPlanView({ data, actions, moveHref, typeHref, programHref, checkinHref, workoutHref }: {
  data: WeekPlanData;
  actions: WeekPlanActions;
  moveHref: (sessionId: string) => string;
  typeHref: string;
  programHref: string;
  checkinHref: string;
  workoutHref: (id: string) => string;
}) {
  const { plan, today } = data;
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
      <div className="grid content-start gap-4">
        <TodayCard data={data} actions={actions} checkinHref={checkinHref} programHref={programHref} workoutHref={workoutHref} />

        <section aria-labelledby="jours-titre" className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="jours-titre" className="label-caps">
              Du lundi au dimanche
            </h2>
            {data.hasProgram ? (
              <span className="text-[13px] text-muted">
                {plan.done} séance{plan.done > 1 ? "s" : ""} faite{plan.done > 1 ? "s" : ""}, {plan.remaining.length - plan.unplaced.length} à venir
              </span>
            ) : null}
          </div>
          <ol className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {plan.days.map((day) => (
              <DayRow key={day.date} day={day} plan={plan} today={today} moveHref={moveHref} />
            ))}
          </ol>
          {plan.unplaced.length ? (
            <p className="flex items-start gap-2 text-[14px] text-muted">
              <WarningIcon size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <span>
                {plan.unplaced.map((s) => s.name).join(", ")} : plus de jour libre d&apos;ici dimanche. Le programme reprendra dans l&apos;ordre la semaine
                prochaine, ou déplace une séance sur un autre jour.
              </span>
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid content-start gap-4">
        <Card aria-labelledby="charge-titre" className="grid gap-2">
          <h2 id="charge-titre" className="text-lg font-semibold">
            Charge des 7 derniers jours
          </h2>
          <p className="text-[15px]">{loadSummary(data.load)}</p>
          <p className="text-[13px] text-muted">
            Minutes × effort (sport léger 3, modéré 5, intense 7, musculation 6) : {data.load.acute.toLocaleString("fr-FR")} points cette semaine, {" "}
            {data.load.chronic.toLocaleString("fr-FR")} en moyenne sur quatre semaines. Une hausse rapide est un signal pour lever le pied.
          </p>
        </Card>

        <Card aria-labelledby="type-titre" className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="type-titre" className="text-lg font-semibold">
              Semaine type
            </h2>
            <Link href={typeHref} className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
              Modifier
            </Link>
          </div>
          <dl className="grid gap-2 text-[15px]">
            <div className="grid gap-0.5">
              <dt className="text-[13px] text-muted">Jours disponibles pour la musculation</dt>
              <dd>{data.availableDays.length ? [...data.availableDays].sort().map((d) => WEEKDAY_NAMES[d - 1]).join(", ") : "tous les jours"}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-[13px] text-muted">Sports fixes</dt>
              <dd>
                {data.weeklySports.length ? (
                  <ul className="grid gap-1">
                    {data.weeklySports.map((w, i) => (
                      <li key={i}>
                        {capitalize(WEEKDAY_NAMES[w.weekday - 1])} : {sportName(w.sport, w.label)}, {formatMinutes(w.minutes)}, {INTENSITY_LABELS[w.intensity].label.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "aucun pour l'instant (le padel du mercredi, le foot du dimanche…)"
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <p className="text-[13px] text-muted">
          Comment c&apos;est placé : les séances du programme dans l&apos;ordre, sur tes jours disponibles, à 48 h au moins d&apos;une séance ou d&apos;un sport
          modéré ou intense qui travaille les mêmes muscles. Une séance ratée est replacée sur les jours qui restent. Tout reste modifiable : déplace une séance,
          elle garde sa place cette semaine. {HEALTH_REMINDER}
        </p>
      </div>
    </div>
  );
}

function TodayCard({ data, actions, checkinHref, programHref, workoutHref }: {
  data: WeekPlanData;
  actions: WeekPlanActions;
  checkinHref: string;
  programHref: string;
  workoutHref: (id: string) => string;
}) {
  const { plan, today, options } = data;
  const day = plan.days.find((d) => d.isToday)!;
  const next = nextPlanned(plan);

  if (data.active) {
    return (
      <Card aria-labelledby="jour-titre" className="grid gap-3 border-accent-text/60">
        <p className="label-caps">Séance en cours</p>
        <h2 id="jour-titre" className="font-title text-[26px]">
          {data.active.name}
        </h2>
        <Link href={workoutHref(data.active.id)} className={buttonClasses("primary", "lg", "w-full")}>
          Reprendre
        </Link>
      </Card>
    );
  }

  if (!options) {
    const done = day.workouts.map((w) => w.name).join(", ");
    return (
      <Card aria-labelledby="jour-titre" className="grid gap-3">
        <p className="label-caps">Aujourd&apos;hui</p>
        <h2 id="jour-titre" className="font-title text-[26px]">
          {done ? "Séance faite" : day.blocked ? "Séance décalée" : "Repos"}
        </h2>
        <p className="text-[15px] text-muted">
          {done ? `${done}. ` : day.blocked ? "Rien de prévu aujourd'hui, repose-toi. " : null}
          {next
            ? `Prochaine séance : ${next.session.name}, ${dayWord(next.date, today)}.`
            : data.hasProgram
              ? plan.remaining.length === 0
                ? "Toutes les séances de la semaine sont faites."
                : "Plus de jour libre cette semaine pour les séances qui restent."
              : null}
        </p>
        {day.blocked && !done ? (
          <form action={actions.free(today)}>
            <SubmitButton variant="secondary" pendingLabel="…">
              Finalement, je m&apos;entraîne aujourd&apos;hui
            </SubmitButton>
          </form>
        ) : null}
        {!data.hasProgram ? (
          <EmptyState icon={<CalendarCheckIcon size={22} />} title="Pas de programme en cours">
            Le planning place les séances de ton programme dans la semaine.{" "}
            <Link href={programHref} className="font-medium text-accent-text underline-offset-4 hover:underline">
              Créer mon programme
            </Link>
          </EmptyState>
        ) : null}
      </Card>
    );
  }

  const { session, advice, postponeTo, replacement } = options;
  const level = options.readiness?.level ?? null;
  const action = advice?.action ?? "normal";
  const postponeDay = postponeTo ? dayWord(postponeTo, today) : null;
  const start = (primary: boolean, light: boolean) => (
    <form key={light ? "alleger" : "normal"} action={actions.start}>
      <input type="hidden" name="templateId" value={session.id} />
      {light ? <input type="hidden" name="light" value="1" /> : null}
      <SubmitButton variant={primary ? "primary" : "secondary"} size={primary ? "lg" : "md"} className="w-full" pendingLabel="Démarrage…">
        {light ? (primary ? "Démarrer en version allégée" : "Version allégée") : primary ? "Démarrer" : "Démarrer telle quelle"}
      </SubmitButton>
    </form>
  );
  const postpone = (primary: boolean) =>
    postponeDay ? (
      <form key="decaler" action={actions.postpone(session.id)}>
        <SubmitButton variant={primary ? "primary" : "secondary"} size={primary ? "lg" : "md"} className="w-full" pendingLabel="…">
          Décaler à {postponeDay}
        </SubmitButton>
      </form>
    ) : null;
  const replace = (primary: boolean) =>
    replacement ? (
      <form key="remplacer" action={actions.move(replacement.id)}>
        <input type="hidden" name="date" value={today} />
        <SubmitButton variant={primary ? "primary" : "secondary"} size={primary ? "lg" : "md"} className="w-full" pendingLabel="…">
          {primary ? `Faire ${replacement.name} à la place` : `Remplacer par ${replacement.name}`}
        </SubmitButton>
      </form>
    ) : null;
  const buttons = { normal: (p: boolean) => start(p, false), alleger: (p: boolean) => start(p, true), decaler: postpone, remplacer: replace };
  const others = (Object.keys(buttons) as (keyof typeof buttons)[]).filter((k) => k !== action).map((k) => buttons[k](false));

  return (
    <Card aria-labelledby="jour-titre" className="grid gap-4 border-accent-text/60">
      <div className="grid gap-1">
        <p className="label-caps">Aujourd&apos;hui{session.pinned ? " · placée à la main" : ""}</p>
        <h2 id="jour-titre" className="font-title text-[26px]">
          {session.name}
        </h2>
      </div>

      {session.conflicts.length ? (
        <ul className="grid gap-1">
          {session.conflicts.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px]">
              <WarningIcon size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              {conflictText(c)}
            </li>
          ))}
        </ul>
      ) : null}

      {level && advice ? (
        <div className="grid gap-1.5 rounded-control bg-surface-2 p-3">
          <p className={cn("flex items-center gap-1.5 text-[14px] font-semibold", LEVEL_STYLE[level].className)}>
            {LEVEL_STYLE[level].icon}
            {LEVEL_LABELS[level]}
          </p>
          <p className="text-[15px]">{adviceText(advice, { level, session: session.name, postponeDay, replacement: replacement?.name ?? null })}</p>
          {level !== "bonne" || advice.action !== "normal" ? <p className="text-[13px] text-muted">{HEALTH_REMINDER}</p> : null}
        </div>
      ) : (
        <p className="text-[14px] text-muted">
          <Link href={checkinHref} className="font-medium text-accent-text underline-offset-4 hover:underline">
            Fais ta forme du jour
          </Link>{" "}
          (dix secondes) pour savoir s&apos;il vaut mieux l&apos;alléger ou la décaler.
        </p>
      )}

      {buttons[action](true)}
      {others.some(Boolean) ? (
        <div className="grid gap-2">
          <p className="text-[13px] text-muted">Ou bien</p>
          <div className="grid gap-2 sm:grid-cols-2">{others}</div>
        </div>
      ) : null}
    </Card>
  );
}

function DayRow({ day, plan, today, moveHref }: { day: PlanDay; plan: WeekPlan; today: string; moveHref: (sessionId: string) => string }) {
  const replaced = day.missed ? plan.days.find((d) => d.session?.id === day.missed!.id) : undefined;
  const empty = !day.workouts.length && !day.session && !day.sports.length && !day.missed;
  return (
    <li className={cn("flex gap-3 px-4 py-3", day.isToday && "bg-surface-2")}>
      <div className="w-10 shrink-0 pt-0.5 text-center" aria-hidden="true">
        <p className={cn("text-[12px]", day.isToday ? "font-semibold text-accent-text" : "text-muted")}>{WEEKDAY_SHORT[day.weekday - 1]}</p>
        <p className={cn("font-numeric text-[20px] leading-tight", day.isPast && "text-muted")}>{dayNumber(day.date)}</p>
      </div>
      <div className="grid min-w-0 flex-1 content-center gap-1.5">
        <h3 className="sr-only">
          {capitalize(WEEKDAY_NAMES[day.weekday - 1])} {dayNumber(day.date)}
          {day.isToday ? " (aujourd'hui)" : ""}
        </h3>
        {day.workouts.map((w, i) => (
          <p key={i} className="flex items-center gap-2 text-[15px] font-medium">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent" aria-hidden="true">
              <CheckIcon size={12} weight="bold" />
            </span>
            <span className="min-w-0 truncate">{w.name}</span>
            <span className="shrink-0 text-[13px] font-normal text-muted">{w.isLight ? "faite, allégée" : "faite"}</span>
          </p>
        ))}
        {day.missed ? (
          <p className="text-[14px] text-muted">
            {day.missed.name} : prévue, pas faite.{" "}
            {replaced ? `Replacée ${dayWord(replaced.date, today)}.` : plan.unplaced.some((s) => s.id === day.missed!.id) ? "Plus de jour libre cette semaine." : null}
          </p>
        ) : null}
        {day.session ? (
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="size-5 shrink-0 rounded-full border-2 border-accent-text" aria-hidden="true" />
              <span className="min-w-0 truncate">{day.session.name}</span>
              {day.session.pinned ? (
                <span className="flex shrink-0 items-center gap-1 text-[13px] font-normal text-muted">
                  <PushPinIcon size={13} aria-hidden="true" /> à la main
                </span>
              ) : null}
            </p>
            {day.session.conflicts.map((c, i) => (
              <p key={i} className="flex items-start gap-1.5 pl-7 text-[13px] text-muted">
                <WarningIcon size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                {conflictText(c)}
              </p>
            ))}
          </div>
        ) : null}
        {day.sports.map((s, i) => (
          <p key={i} className="flex items-center gap-2 text-[14px]">
            <span className="grid size-5 shrink-0 place-items-center text-accent-text">
              <SportIcon sport={isSport(s.sport) ? s.sport : "autre"} size={18} />
            </span>
            <span className="min-w-0 truncate">{sportName(s.sport, s.label)}</span>
            <span className="shrink-0 text-[13px] text-muted">
              {formatMinutes(s.minutes)}, {s.done ? "noté" : "prévu"}
            </span>
          </p>
        ))}
        {empty ? <p className="text-[14px] text-muted">{day.blocked ? "Sans séance, à ta demande" : "Repos"}</p> : null}
      </div>
      {day.session ? (
        <Link
          href={moveHref(day.session.id)}
          aria-label={`Déplacer ${day.session.name}`}
          className="-my-1 -mr-2 flex min-h-11 shrink-0 items-center self-center px-2 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
        >
          Déplacer
        </Link>
      ) : null}
    </li>
  );
}
