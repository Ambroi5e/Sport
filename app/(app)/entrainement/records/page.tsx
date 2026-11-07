import { TrophyIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { RecordTiles, recordTiles } from "@/components/training/record-tiles";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { getCompletedSets, getExercises, summarizeHistory } from "../data";

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage() {
  const [profile, exercises] = await Promise.all([getProfile(), getExercises()]);
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";
  const history = summarizeHistory(await getCompletedSets(exercises.map((e) => e.id)));
  const done = exercises
    .filter((e) => history[e.id])
    .map((e) => ({ exercise: e, tiles: recordTiles(history[e.id].records, e.measure, unit), lastDate: history[e.id].lastDate ?? "" }))
    .filter((x) => x.tiles.length)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  return (
    <>
      <PageHeader back="/entrainement" title="Records" />
      {done.length === 0 ? (
        <EmptyState icon={<TrophyIcon size={22} />} title="Pas encore de record">
          Chaque exercice aura ici son 1RM estimé, sa charge max et son meilleur nombre de répétitions, dès tes premières séries validées.
        </EmptyState>
      ) : (
        <div className="grid gap-6 md:max-w-3xl">
          {done.map(({ exercise, tiles }) => (
            <section key={exercise.id} aria-labelledby={`record-${exercise.id}`} className="grid gap-2">
              <h2 id={`record-${exercise.id}`}>
                <Link href={`/entrainement/exercices/${exercise.id}`} className="text-[17px] font-semibold underline-offset-4 hover:underline">
                  {exercise.name}
                </Link>
              </h2>
              <RecordTiles tiles={tiles.slice(0, 4)} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
