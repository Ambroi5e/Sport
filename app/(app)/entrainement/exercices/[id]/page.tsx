import { ChartLineUpIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { RecordTiles, recordTiles } from "@/components/training/record-tiles";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { formatLongDate } from "@/lib/dates";
import { EQUIPMENT_LABELS, MEASURE_LABELS, MUSCLE_LABELS, formatSet } from "@/lib/training";
import { archiveExercise } from "../../actions";
import { getCompletedSets, getExercise, summarizeHistory, type CompletedSet } from "../../data";

export const metadata: Metadata = { title: "Exercice" };

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, exercise] = await Promise.all([getProfile(), getExercise(id)]);
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";
  const sets = await getCompletedSets([exercise.id]);
  const history = summarizeHistory(sets)[exercise.id];
  const tiles = history ? recordTiles(history.records, exercise.measure, unit) : [];

  // Séances de la plus récente à la plus ancienne, séries dans l'ordre.
  const sessions: { workoutId: string; name: string; date: string; sets: CompletedSet[] }[] = [];
  for (const s of sets) {
    const session = sessions.find((x) => x.workoutId === s.workoutId);
    if (session) session.sets.push(s);
    else sessions.push({ workoutId: s.workoutId, name: s.workoutName, date: s.date, sets: [s] });
  }
  for (const session of sessions) session.sets.sort((a, b) => a.setNumber - b.setNumber);

  const personal = exercise.user_id !== null && exercise.user_id === profile?.user_id;

  return (
    <>
      <PageHeader back="/entrainement/exercices" eyebrow={EQUIPMENT_LABELS[exercise.equipment]} title={exercise.name} />
      <div className="grid gap-4 md:max-w-3xl">
        <Card className="grid gap-2">
          <p className="text-[15px]">
            <span className="text-muted">Muscles : </span>
            <span className="font-medium">{exercise.primary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</span>
            {exercise.secondary_muscles.length ? (
              <span className="text-muted"> (aussi : {exercise.secondary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")})</span>
            ) : null}
          </p>
          <p className="text-[15px] text-muted">{MEASURE_LABELS[exercise.measure]}</p>
        </Card>

        {sessions.length === 0 ? (
          <EmptyState icon={<ChartLineUpIcon size={22} />} title="Pas encore de série">
            Tes records et ton historique sur cet exercice apparaîtront ici dès ta première série validée.
          </EmptyState>
        ) : (
          <>
            {tiles.length ? (
              <section aria-labelledby="records-titre" className="grid gap-3">
                <h2 id="records-titre" className="text-lg font-semibold">
                  Records
                </h2>
                <RecordTiles tiles={tiles} />
              </section>
            ) : null}
            <section aria-labelledby="historique-titre" className="grid gap-3">
              <h2 id="historique-titre" className="text-lg font-semibold">
                Historique
              </h2>
              <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
                {sessions.slice(0, 30).map((session) => (
                  <li key={session.workoutId}>
                    <Link href={`/entrainement/seance/${session.workoutId}`} className="grid gap-1 px-4 py-3 hover:bg-surface-2">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[15px] font-medium">{session.name}</span>
                        <span className="shrink-0 text-[13px] text-muted">{formatLongDate(session.date)}</span>
                      </span>
                      <span className="font-numeric text-[17px] text-muted">
                        {session.sets.map((s) => `${s.isWarmup ? "(é) " : ""}${formatSet(s, unit)}`).join("  ·  ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {personal ? (
          <ConfirmAction
            action={archiveExercise.bind(null, exercise.id)}
            label="Retirer de ma bibliothèque"
            confirmLabel="Retirer"
            question={`Retirer « ${exercise.name} » de ta bibliothèque ? Tes séances passées gardent leurs séries.`}
          />
        ) : null}
      </div>
    </>
  );
}
