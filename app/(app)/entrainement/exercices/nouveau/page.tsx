import type { Metadata } from "next";
import { ExerciseForm } from "@/components/training/exercise-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Nouvel exercice" };

const RETURN_PATH = /^\/entrainement(\/[a-z0-9-]+)*$/;

export default async function NewExercisePage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const { retour } = await searchParams;
  const back = retour && RETURN_PATH.test(retour) ? retour : "/entrainement/exercices";
  return (
    <>
      <PageHeader back={back} title="Nouvel exercice" />
      <div className="md:max-w-xl">
        <ExerciseForm retour={back === "/entrainement/exercices" ? undefined : back} />
      </div>
    </>
  );
}
