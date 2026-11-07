import { BarbellIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ChartTable } from "@/components/charts/chart-table";
import { LineChart } from "@/components/charts/line-chart";
import { WeeklyVolume } from "@/components/progress/weekly-volume";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDelta } from "@/lib/body";
import { formatAxisDate } from "@/lib/charts";
import { e1rmHistory, kgTo, mostTrackedExercises, weeklyVolume, type SetEntry, type WeightUnit } from "@/lib/engine";
import { formatWeight } from "@/lib/training";

/** Semaines affichées pour le 1RM estimé. */
export const STRENGTH_WEEKS = 12;
const WEEKS = STRENGTH_WEEKS;

/** Exercices montrés : les plus suivis sur la période. */
export function strengthExercises(sets: SetEntry[]): string[] {
  return mostTrackedExercises(e1rmHistory(sets), 4);
}

/** Section Force : volume par semaine et 1RM estimé des exercices les plus suivis. */
export function StrengthView({
  sets,
  names,
  start,
  today,
  unit,
}: {
  sets: SetEntry[];
  names: Record<string, string>;
  start: string;
  today: string;
  unit: WeightUnit;
}) {
  const history = e1rmHistory(sets);
  const top = mostTrackedExercises(history, 4);
  const weeks = weeklyVolume(sets, today, 8);
  const axis = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

  return (
    <>
      {sets.length === 0 ? (
        <EmptyState icon={<BarbellIcon size={22} />} title="Pas encore de séance">
          Dès tes premières séries validées, tu verras ici ton volume par semaine et l&apos;évolution de ton 1RM estimé.{" "}
          <Link href="/entrainement" className="font-medium text-accent-text underline-offset-4 hover:underline">
            Démarrer une séance
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-6">
          <Card aria-labelledby="volume-titre" className="grid content-start gap-3">
            <h2 id="volume-titre" className="text-lg font-semibold">
              Volume par semaine
            </h2>
            <WeeklyVolume weeks={weeks} unit={unit} />
            <p className="text-[13px] text-muted">Charge × répétitions de toutes les séries validées, échauffements exclus.</p>
          </Card>

          <Card aria-labelledby="e1rm-titre" className="grid content-start gap-4">
            <div>
              <h2 id="e1rm-titre" className="text-lg font-semibold">
                1RM estimé
              </h2>
              <p className="text-[13px] text-muted">Meilleure série de chaque séance, sur {WEEKS} semaines.</p>
            </div>
            {top.length === 0 ? (
              <p className="text-[15px] text-muted">Aucune série de 1 à 12 répétitions avec charge sur la période.</p>
            ) : (
              <>
                <ul className="grid gap-5">
                  {top.map((id) => {
                    const points = history[id].map((p) => ({ date: p.date, value: kgTo(unit, p.e1rm) }));
                    const first = history[id][0];
                    const last = history[id][history[id].length - 1];
                    return (
                      <li key={id} className="grid gap-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="min-w-0 truncate text-[15px] font-medium">{names[id] ?? "Exercice"}</h3>
                          <p className="shrink-0 text-[13px] text-muted">
                            <span className="font-numeric text-[22px] text-text">{formatWeight(last.e1rm, unit)}</span> {unit}
                          </p>
                        </div>
                        <figure className="grid gap-1">
                          <LineChart line={points} from={start} to={today} format={(v) => axis.format(v)} className="h-24" ticks={2} />
                          <figcaption className="text-[13px] text-muted">
                            {history[id].length > 1
                              ? `${formatDelta(kgTo(unit, last.e1rm - first.e1rm))} ${unit} depuis le ${formatAxisDate(first.date)}, sur ${history[id].length} séances.`
                              : `Une séance, le ${formatAxisDate(last.date)}.`}
                          </figcaption>
                        </figure>
                      </li>
                    );
                  })}
                </ul>
                <ChartTable
                  caption={`1RM estimé par séance, en ${unit}`}
                  headers={["Séance", "Meilleure série", "1RM estimé"]}
                  rows={top.flatMap((id) =>
                    [...history[id]].reverse().map((p) => ({
                      key: `${id}-${p.workoutId}`,
                      cells: [`${names[id] ?? "Exercice"} · ${formatAxisDate(p.date)}`, `${formatWeight(p.weightKg, unit)} × ${p.reps}`, formatWeight(p.e1rm, unit)],
                    })),
                  )}
                />
                <p className="text-[13px] text-muted">
                  Formule d&apos;Epley, sur les séries de 12 répétitions au plus. C&apos;est une estimation, pas un test : ne cherche pas ton maximum
                  sans échauffement ni partenaire.
                </p>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
