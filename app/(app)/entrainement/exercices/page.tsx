import { PlusIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseList } from "@/components/training/exercise-list";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getExercises } from "../data";

export const metadata: Metadata = { title: "Exercices" };

export default async function ExercisesPage() {
  const exercises = await getExercises();
  return (
    <>
      <PageHeader
        back="/entrainement"
        title="Exercices"
        action={
          <Link href="/entrainement/exercices/nouveau" className={buttonClasses("secondary", "md", "shrink-0")}>
            <PlusIcon size={18} weight="bold" aria-hidden="true" />
            Créer
          </Link>
        }
      />
      <ExerciseList exercises={exercises} />
    </>
  );
}
