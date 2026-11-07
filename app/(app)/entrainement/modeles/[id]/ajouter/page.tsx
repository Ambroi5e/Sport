import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseList } from "@/components/training/exercise-list";
import { PageHeader } from "@/components/ui/page-header";
import { addExerciseToTemplate } from "../../../actions";
import { getExercises, getTemplate } from "../../../data";

export const metadata: Metadata = { title: "Ajouter au modèle" };

export default async function AddToTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [template, exercises] = await Promise.all([getTemplate(id), getExercises()]);
  const here = `/entrainement/modeles/${template.id}/ajouter`;
  return (
    <>
      <PageHeader back={`/entrainement/modeles/${template.id}`} eyebrow={template.name} title="Ajouter un exercice" />
      <ExerciseList exercises={exercises} addAction={addExerciseToTemplate.bind(null, template.id)} />
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
