import { BarbellIcon, CaretRightIcon, ClockCounterClockwiseIcon, ListChecksIcon, TrophyIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MuscleVolume } from "@/components/training/muscle-volume";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { getProfile } from "@/lib/auth";
import { formatLongDate, localDate, weekStart } from "@/lib/dates";
import { setsPerMuscle } from "@/lib/engine";
import { formatElapsed, formatVolume } from "@/lib/training";
import { startWorkout } from "./actions";
import { getActiveWorkout, getSetsSince, getTemplates, getWorkoutHistory } from "./data";

export const metadata: Metadata = { title: "Entraînement" };

export default async function TrainingPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const monday = weekStart(localDate(profile.timezone));
  const [active, templates, recent, week] = await Promise.all([getActiveWorkout(), getTemplates(), getWorkoutHistory(3), getSetsSince(monday)]);
  const perMuscle = setsPerMuscle(week.sets, week.muscles);
  const ready = templates.filter((t) => t.exerciseNames.length > 0);

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
            <Card aria-labelledby="demarrer-titre" className="grid gap-4">
              <h2 id="demarrer-titre" className="text-lg font-semibold">
                Démarrer
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
              ) : (
                <p className="text-[15px] text-muted">
                  Crée un modèle pour lancer ta séance type en un tap, ou commence une séance libre et ajoute les exercices au fur et à mesure.
                </p>
              )}
              <form action={startWorkout}>
                <SubmitButton variant="secondary" className="w-full" pendingLabel="Démarrage…">
                  Séance libre
                </SubmitButton>
              </form>
            </Card>
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
