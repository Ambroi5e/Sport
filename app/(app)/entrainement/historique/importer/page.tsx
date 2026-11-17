import type { Metadata } from "next";
import { StrengthImport } from "@/components/training/strength-import";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { getExerciseChoices } from "../../data";
import { importWorkouts } from "./actions";

export const metadata: Metadata = { title: "Importer des séances" };

export default async function ImportWorkoutsPage() {
  const [profile, choices] = await Promise.all([getProfile(), getExerciseChoices()]);
  return (
    <>
      <PageHeader title="Importer des séances" back="/entrainement/historique" />
      <div className="md:max-w-3xl">
        <StrengthImport action={importWorkouts} choices={choices} unit={profile?.weight_unit === "lb" ? "lb" : "kg"} />
      </div>
    </>
  );
}
