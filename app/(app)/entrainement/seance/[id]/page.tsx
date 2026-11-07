import { TrophyIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { FinishWorkoutButton } from "@/components/training/finish-workout-button";
import { WorkoutLogger, type LoggerBlock } from "@/components/training/workout-logger";
import { getProfile } from "@/lib/auth";
import { formatLongDate } from "@/lib/dates";
import { exerciseRecords, totalVolume, type SetEntry } from "@/lib/engine";
import { formatElapsed, formatVolume, formatWeight } from "@/lib/training";
import { deleteWorkout, finishWorkout, saveWorkoutAsTemplate } from "../../actions";
import { getCompletedSets, getWorkout, summarizeHistory } from "../../data";

export const metadata: Metadata = { title: "Séance" };

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, workout] = await Promise.all([getProfile(), getWorkout(id)]);
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";
  const exerciseIds = [...new Set(workout.blocks.map((b) => b.exercise.id))];
  const history = summarizeHistory(await getCompletedSets(exerciseIds, workout.id));
  const finished = workout.ended_at !== null;

  const blocks: LoggerBlock[] = workout.blocks.map((b) => ({
    order: b.order,
    exercise: { id: b.exercise.id, name: b.exercise.name, measure: b.exercise.measure },
    sets: b.sets.map((s) => ({
      id: s.id,
      setNumber: s.set_number,
      weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
      reps: s.reps,
      durationSeconds: s.duration_seconds,
      repMin: s.rep_min,
      repMax: s.rep_max,
      isWarmup: s.is_warmup,
      done: s.completed_at !== null,
      completedAt: s.completed_at,
    })),
  }));

  // Résumé d'une séance terminée : volume et records battus par rapport à avant.
  const doneSets: SetEntry[] = workout.blocks.flatMap((b) =>
    b.sets
      .filter((s) => s.completed_at)
      .map((s) => ({
        exerciseId: b.exercise.id,
        workoutId: workout.id,
        date: workout.performed_on,
        weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
        reps: s.reps,
        durationSeconds: s.duration_seconds,
        isWarmup: s.is_warmup,
      })),
  );
  const beaten = finished
    ? workout.blocks.flatMap((b) => {
        const before = history[b.exercise.id]?.records;
        if (!before?.bestE1RM && !before?.heaviest) return [];
        const after = exerciseRecords([...doneSets.filter((s) => s.exerciseId === b.exercise.id), ...recordsAsSets(before)]);
        const lines: string[] = [];
        if (after.bestE1RM && before.bestE1RM && after.bestE1RM.value > before.bestE1RM.value + 1e-9) {
          lines.push(`1RM estimé ${formatWeight(after.bestE1RM.value, unit)} ${unit}`);
        }
        if (after.heaviest && before.heaviest && after.heaviest.weightKg > before.heaviest.weightKg + 1e-9) {
          lines.push(`charge max ${formatWeight(after.heaviest.weightKg, unit)} ${unit}`);
        }
        return lines.length ? [{ name: b.exercise.name, text: lines.join(", ") }] : [];
      })
    : [];

  const workingSets = doneSets.filter((s) => !s.isWarmup).length;
  const elapsed = formatElapsed(workout.started_at, workout.ended_at);

  return (
    <>
      <PageHeader back="/entrainement" eyebrow={formatLongDate(workout.performed_on)} title={workout.name} />

      {finished ? (
        <Card aria-labelledby="resume-titre" className="mb-4 grid gap-3">
          <h2 id="resume-titre" className="text-lg font-semibold">
            Séance terminée
          </h2>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Durée" value={elapsed ?? "--"} />
            <Stat label="Séries" value={String(workingSets)} />
            <Stat label="Volume" value={formatVolume(totalVolume(doneSets), unit)} />
          </dl>
          {beaten.length ? (
            <ul className="grid gap-1.5">
              {beaten.map((r) => (
                <li key={r.name} className="flex items-start gap-2 text-[15px]">
                  <TrophyIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{r.name}</span> : nouveau record, {r.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <WorkoutLogger
        userId={profile?.user_id ?? ""}
        key={blocks.map((b) => `${b.order}:${b.sets.length}`).join(",")}
        workoutId={workout.id}
        blocks={blocks}
        history={Object.fromEntries(
          Object.entries(history).map(([exerciseId, h]) => [
            exerciseId,
            { records: h.records, lastDate: h.lastDate, last: h.last.map((s) => ({ weightKg: s.weightKg, reps: s.reps, durationSeconds: s.durationSeconds })) },
          ]),
        )}
        unit={unit}
        finished={finished}
      />

      <div className="mt-6 grid gap-3">
        {finished ? (
          <>
            <form action={saveWorkoutAsTemplate.bind(null, workout.id)}>
              <SubmitButton variant="secondary" className="w-full">
                Enregistrer comme modèle
              </SubmitButton>
            </form>
            <ConfirmAction
              action={deleteWorkout.bind(null, workout.id)}
              label="Supprimer la séance"
              confirmLabel="Supprimer définitivement"
              question={`Supprimer « ${workout.name} » et ses ${workingSets} séries ? Tes records seront recalculés sans elle.`}
            />
          </>
        ) : (
          <FinishWorkoutButton userId={profile?.user_id ?? ""} workoutId={workout.id} action={finishWorkout.bind(null, workout.id)} />
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-surface-2 p-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="font-numeric mt-1 text-[24px]">{value}</dd>
    </div>
  );
}

/** Rejoue les records précédents comme des séries, pour les comparer aux séries du jour. */
function recordsAsSets(r: ReturnType<typeof exerciseRecords>): SetEntry[] {
  const out: SetEntry[] = [];
  if (r.bestE1RM) out.push({ exerciseId: "", workoutId: "avant", date: r.bestE1RM.date, weightKg: r.bestE1RM.weightKg, reps: r.bestE1RM.reps });
  if (r.heaviest) out.push({ exerciseId: "", workoutId: "avant", date: r.heaviest.date, weightKg: r.heaviest.weightKg, reps: r.heaviest.reps });
  return out;
}
