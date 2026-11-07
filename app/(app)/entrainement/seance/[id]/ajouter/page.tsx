import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseList } from "@/components/training/exercise-list";
import { PageHeader } from "@/components/ui/page-header";
import { addExerciseToWorkout } from "../../../actions";
import { getExercises, getWorkout } from "../../../data";

export const metadata: Metadata = { title: "Ajouter un exercice" };

export default async function AddToWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workout, exercises] = await Promise.all([getWorkout(id), getExercises()]);
  const here = `/entrainement/seance/${workout.id}/ajouter`;
  return (
    <>
      <PageHeader back={`/entrainement/seance/${workout.id}`} eyebrow={workout.name} title="Ajouter un exercice" />
      <ExerciseList exercises={exercises} addAction={addExerciseToWorkout.bind(null, workout.id)} />
      <p className="mt-4 text-[15px] text-muted">
        Il manque un exercice ?{" "}
        <Link href={`/entrainement/exercices/nouveau?retour=${here}`} className="font-medium text-accent-text underline-offset-4 hover:underline">
          Crée-le
        </Link>
        , puis ajoute-le ici.
      </p>
    </>
  );
}
