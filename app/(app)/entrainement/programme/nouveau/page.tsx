import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProgramForm } from "@/components/training/program-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { goalOptions } from "@/lib/program";
import { getExercises } from "../../data";
import { createProgram } from "../actions";
import { getActiveProgram } from "../data";

export const metadata: Metadata = { title: "Nouveau programme" };

export default async function NewProgramPage() {
  const profile = (await getProfile())!;
  const [active, exercises] = await Promise.all([getActiveProgram(), getExercises()]);
  if (active) redirect("/entrainement/programme");
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";

  return (
    <>
      <PageHeader back="/entrainement/programme" title="Nouveau programme" />
      <div className="grid gap-4 md:max-w-2xl">
        <p className="text-[15px] text-muted">
          Fonte répartit tes séances sur la semaine, choisit les exercices selon ton matériel et tes préférences, puis te propose la charge du jour à chaque
          séance. Tout reste modifiable ensuite.
        </p>
        <Card>
          <ProgramForm
            action={createProgram}
            defaults={{ sessions: Math.min(6, Math.max(2, profile.sessions_per_week ?? (profile.training_days.length || 3))) }}
            goalOptions={goalOptions(exercises)}
            unit={unit}
            minDate={addDays(localDate(profile.timezone), 1)}
          />
        </Card>
      </div>
    </>
  );
}
