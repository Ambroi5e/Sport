import { BarbellIcon, FlagIcon } from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { WeightTrend } from "@/components/weight/trend";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { StylePicker } from "@/components/settings/style-picker";
import { ExerciseForm } from "@/components/training/exercise-form";
import { ExerciseList } from "@/components/training/exercise-list";
import { MuscleVolume } from "@/components/training/muscle-volume";
import { RecordTiles, recordTiles } from "@/components/training/record-tiles";
import { TemplateItems } from "@/components/training/template-forms";
import { RestTimerDock } from "@/components/training/rest-timer";
import { WorkoutLogger } from "@/components/training/workout-logger";
import { SessionSettings } from "@/components/settings/session-settings";
import { SAMPLE_BLOCKS, SAMPLE_EXERCISES, SAMPLE_HISTORY, SAMPLE_ITEMS, SAMPLE_VOLUME } from "./exemples";
import { getAppearance } from "@/lib/appearance";

/**
 * Aperçu des écrans connectés avec des données d'exemple, pour les captures
 * Playwright (375 px et 1440 px). Inaccessible en production.
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ecran?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { ecran = "accueil" } = await searchParams;
  const appearance = await getAppearance();

  if (ecran === "onboarding") {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-[560px] content-start gap-6 px-4 pb-10 pt-6">
        <OnboardingForm />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AppNav isAdmin={false} />
      <main className="pt-safe mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pb-[calc(152px+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-28">
        {ecran === "reglages" ? (
          <>
            <PageHeader title="Réglages" back="/apercu" />
            <div className="grid gap-4 md:max-w-xl">
              <Card className="grid gap-4">
                <h2 className="text-lg font-semibold">Style</h2>
                <StylePicker current={appearance.style} theme={appearance.theme} unit="kg" />
              </Card>
              <Card className="grid gap-4">
                <h2 className="text-lg font-semibold">Séance</h2>
                <SessionSettings />
              </Card>
            </div>
          </>
        ) : ecran === "entrainement" ? (
          <>
            <PageHeader title="Entraînement" />
            <div className="grid gap-4 md:max-w-xl">
              <Card className="grid gap-4">
                <h2 className="text-lg font-semibold">Volume de la semaine</h2>
                <MuscleVolume perMuscle={SAMPLE_VOLUME} />
              </Card>
              <EmptyState icon={<BarbellIcon size={22} />} title="Aucun modèle pour l'instant">
                Un modèle, c&apos;est ta séance type : ses exercices, ses séries et ta fourchette de répétitions.
              </EmptyState>
            </div>
          </>
        ) : ecran === "seance" ? (
          <>
            <PageHeader back="/apercu" eyebrow="vendredi 7 novembre" title="Push A" />
            <WorkoutLogger userId="apercu" workoutId="apercu" blocks={SAMPLE_BLOCKS} history={SAMPLE_HISTORY} unit="kg" finished={false} />
          </>
        ) : ecran === "modele" ? (
          <>
            <PageHeader back="/apercu" eyebrow="Modèle" title="Push A" />
            <div className="md:max-w-2xl">
              <TemplateItems templateId="apercu" items={SAMPLE_ITEMS} />
            </div>
          </>
        ) : ecran === "exercices" ? (
          <>
            <PageHeader back="/apercu" title="Exercices" />
            <ExerciseList exercises={SAMPLE_EXERCISES} />
          </>
        ) : ecran === "exercice" ? (
          <>
            <PageHeader back="/apercu" eyebrow="Barre" title="Développé couché" />
            <div className="grid gap-6 md:max-w-3xl">
              <RecordTiles tiles={recordTiles(SAMPLE_HISTORY["ex-dc"].records, "charge", "kg")} />
              <ExerciseForm />
            </div>
          </>
        ) : (
          <>
            <PageHeader eyebrow="ven. 7 nov." title="Salut Exemple" />
            <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
              <Card className="grid gap-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">Pesée du jour</h2>
                  <span className="text-sm font-medium text-accent-text">Historique</span>
                </div>
                <QuickWeigh initial={85.2} unit="kg" loggedToday={false} />
                <WeightTrend average7={84.86} rate={0.38} status="dans_la_cible" target={{ min: 0.25, max: 0.5 }} unit="kg" />
              </Card>
              <div className="grid content-start gap-4">
                <Card className="grid gap-2">
                  <p className="label-caps flex items-center gap-1.5">
                    <FlagIcon size={14} weight="fill" aria-hidden="true" /> Objectif
                  </p>
                  <h2 className="font-title text-[26px]">Prise de masse</h2>
                  <p className="text-[15px] text-muted">Rythme visé : 0,25 à 0,5 kg par semaine.</p>
                </Card>
                <Card className="grid gap-2">
                  <h2 className="text-lg font-semibold">Cette semaine</h2>
                  <p className="text-[15px] text-muted">
                    Les séances, les calories et les protéines du jour s&apos;afficheront ici dès que l&apos;entraînement et la nutrition
                    seront disponibles.
                  </p>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
      <RestTimerDock />
    </div>
  );
}
