import { BarbellIcon, CalendarCheckIcon, CalendarDotsIcon, CaretRightIcon, ClockCounterClockwiseIcon, ListChecksIcon, SneakerMoveIcon, TrophyIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MuscleVolume } from "@/components/training/muscle-volume";
import { ProgramNextCard } from "@/components/training/program-next-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { getProfile } from "@/lib/auth";
import { formatLongDate, localDate, weekStart } from "@/lib/dates";
import { isDeloadWeek, nextPlanned, nextSessionIndex, programWeek, setsPerMuscle } from "@/lib/engine";
import { ADAPT_HINTS, capitalize, dayWord } from "@/lib/planning";
import { formatElapsed, formatVolume } from "@/lib/training";
import { startWorkout } from "./actions";
import { getActiveWorkout, getSetsSince, getTemplates, getWorkoutHistory } from "./data";
import { getWeekContext } from "./semaine/data";

export const metadata: Metadata = { title: "Entraînement" };

export default async function TrainingPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const monday = weekStart(localDate(profile.timezone));
  const today = localDate(profile.timezone);
  const [active, templates, recent, week, planning] = await Promise.all([getActiveWorkout(), getTemplates(), getWorkoutHistory(3), getSetsSince(monday), getWeekContext()]);
  const { program, plan } = planning;
  const sportDates = planning.input.activities.filter((a) => a.date >= monday);
  const perMuscle = setsPerMuscle(week.sets, week.muscles);
  // Les séances du programme passent par la carte Programme ; les autres modèles restent ici.
  const ready = templates.filter((t) => t.exerciseNames.length > 0 && (!program || t.programId !== program.id));
  // La prochaine séance est celle que le planning place en premier ; sinon la suivante dans l'ordre.
  const placed = nextPlanned(plan);
  const next = program
    ? (program.sessions.find((s) => s.id === placed?.session.id) ??
      program.sessions[
        nextSessionIndex(
          program.sessions.map((s) => s.id),
          program.lastDone?.template_id ?? null,
        )
      ])
    : undefined;
  const when = placed && next?.id === placed.session.id ? capitalize(dayWord(placed.date, today)) : null;
  const hint = planning.options?.advice && placed?.date === today ? ADAPT_HINTS[planning.options.advice.action] : null;
  const programWeekNumber = program ? programWeek(program.starts_on, today) : 0;

  return (
    <>
      <PageHeader title="Entraînement" />
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
        <div className="grid content-start gap-4">
          {active ? (
            <Card aria-labelledby="en-cours-titre" className="grid gap-3 border-accent-text/60">
              <p className="label-caps">Séance en cours</p>
              <h2 id="en-cours-titre" className="font-title text-[26px]">
                {active.name}
              </h2>
              <Link href={`/entrainement/seance/${active.id}`} className={buttonClasses("primary", "lg", "w-full")}>
                Reprendre
              </Link>
            </Card>
          ) : (
            <>
              {program && next ? (
                <ProgramNextCard
                  week={Math.min(programWeekNumber, program.weeks)}
                  deload={isDeloadWeek(programWeekNumber, program.deload_every)}
                  session={{ id: next.id, name: next.name, exerciseNames: next.items.map((i) => i.exercise.name) }}
                  when={when}
                  hint={hint}
                  startAction={startWorkout}
                />
              ) : null}
              <Card aria-labelledby="demarrer-titre" className="grid gap-4">
                <h2 id="demarrer-titre" className="text-lg font-semibold">
                  {program ? "Autre séance" : "Démarrer"}
                </h2>
                {ready.length ? (
                  <ul className="grid gap-2">
                    {ready.map((t) => (
                      <li key={t.id}>
                        <form action={startWorkout} className="flex items-center gap-3 rounded-control border border-line bg-surface-2 p-3">
                          <input type="hidden" name="templateId" value={t.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] font-semibold">{t.name}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {t.exerciseNames.length} exercices · {t.totalSets} séries
                            </span>
                          </span>
                          <SubmitButton variant="secondary" className="shrink-0" pendingLabel="…">
                            Démarrer
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : program ? null : (
                  <p className="text-[15px] text-muted">
                    Crée un programme ou un modèle pour lancer ta séance type en un tap, ou commence une séance libre et ajoute les exercices au fur et à mesure.
                  </p>
                )}
                <form action={startWorkout}>
                  <SubmitButton variant="secondary" className="w-full" pendingLabel="Démarrage…">
                    Séance libre
                  </SubmitButton>
                </form>
              </Card>
            </>
          )}

          <Card aria-labelledby="volume-titre" className="grid gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="volume-titre" className="text-lg font-semibold">
                Volume de la semaine
              </h2>
              <span className="text-[13px] text-muted">depuis lundi</span>
            </div>
            <MuscleVolume perMuscle={perMuscle} />
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <nav aria-label="Musculation" className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            <NavRow
              href="/entrainement/programme"
              icon={<CalendarCheckIcon size={20} />}
              label="Programme"
              detail={program ? `${program.name}, semaine ${Math.min(programWeekNumber, program.weeks)}` : "Séances générées, charge suggérée"}
            />
            <NavRow
              href="/entrainement/semaine"
              icon={<CalendarDotsIcon size={20} />}
              label="Ma semaine"
              detail={program ? `${plan.done} faite${plan.done > 1 ? "s" : ""}, ${plan.remaining.length - plan.unplaced.length} à venir` : "Séances placées, sports, forme du jour"}
            />
            <NavRow
              href="/entrainement/sports"
              icon={<SneakerMoveIcon size={20} />}
              label="Sports"
              detail={sportDates.length ? `${sportDates.length} cette semaine` : "Padel, foot, tennis, escalade…"}
            />
            <NavRow href="/entrainement/modeles" icon={<ListChecksIcon size={20} />} label="Modèles" detail={`${templates.length} modèle${templates.length > 1 ? "s" : ""}`} />
            <NavRow href="/entrainement/exercices" icon={<BarbellIcon size={20} />} label="Exercices" detail="Bibliothèque et fiches" />
            <NavRow href="/entrainement/records" icon={<TrophyIcon size={20} />} label="Records" detail="1RM estimé, charges max" />
            <NavRow href="/entrainement/historique" icon={<ClockCounterClockwiseIcon size={20} />} label="Historique" detail="Toutes tes séances" />
          </nav>

          {recent.length ? (
            <section aria-labelledby="recentes-titre" className="grid gap-2">
              <h2 id="recentes-titre" className="label-caps">
                Dernières séances
              </h2>
              <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
                {recent.map((w) => (
                  <li key={w.id}>
                    <Link href={`/entrainement/seance/${w.id}`} className="grid gap-0.5 px-4 py-3 hover:bg-surface-2">
                      <span className="truncate text-[15px] font-medium">{w.name}</span>
                      <span className="text-[13px] text-muted">
                        {formatLongDate(w.performedOn)} · {w.sets} séries
                        {w.volumeKg > 0 ? ` · ${formatVolume(w.volumeKg, unit)}` : ""}
                        {formatElapsed(w.startedAt, w.endedAt) ? ` · ${formatElapsed(w.startedAt, w.endedAt)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function NavRow({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
