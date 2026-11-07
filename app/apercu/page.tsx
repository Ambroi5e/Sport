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
import { FoodForm } from "@/components/nutrition/food-form";
import { FoodPicker } from "@/components/nutrition/food-picker";
import { MealTabs } from "@/components/nutrition/meal-tabs";
import { GramsForm } from "@/components/nutrition/grams-form";
import { NutritionDay } from "@/components/nutrition/nutrition-day";
import { Per100 } from "@/components/nutrition/per-100";
import { QuickPicks } from "@/components/nutrition/quick-picks";
import { TargetsForm } from "@/components/nutrition/targets-form";
import { TodayNutritionCard } from "@/components/nutrition/today-card";
import { addFoodLog, createFood } from "@/app/(app)/nutrition/actions";
import { saveMeasurements, uploadPhoto } from "@/app/(app)/progres/actions";
import { CompareView } from "@/components/progress/compare-view";
import { MeasurementsForm } from "@/components/progress/measurements-form";
import { MeasurementsView, MeasurementTips } from "@/components/progress/measurements-view";
import { PaceAlertNotice } from "@/components/progress/pace-alert";
import { PhotoForm } from "@/components/progress/photo-form";
import { PhotosView } from "@/components/progress/photos-view";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { StrengthView } from "@/components/progress/strength-view";
import { WeekCard } from "@/components/progress/week-card";
import { WeeklyVolume } from "@/components/progress/weekly-volume";
import { WeightView } from "@/components/progress/weight-view";
import { addDays, weekStart } from "@/lib/dates";
import { currentWeek, movingAverage, paceAlert, rateStatus, sumNutrients, weeklyRate, weeklyVolume } from "@/lib/engine";
import {
  SAMPLE_BLOCKS,
  SAMPLE_DAY,
  SAMPLE_EXERCISE_NAMES,
  SAMPLE_EXERCISES,
  SAMPLE_FAVORITES,
  SAMPLE_FOODS,
  SAMPLE_FREQUENT,
  SAMPLE_HISTORY,
  SAMPLE_ITEMS,
  SAMPLE_MEASUREMENTS,
  SAMPLE_PHOTOS,
  SAMPLE_SETS,
  SAMPLE_TARGETS,
  SAMPLE_TODAY,
  SAMPLE_VOLUME,
  SAMPLE_WEIGHTS,
  SAMPLE_YESTERDAY,
} from "./exemples";
import { getAppearance } from "@/lib/appearance";

/**
 * Aperçu des écrans connectés avec des données d'exemple, pour les captures
 * Playwright (375 px et 1440 px). Inaccessible en production.
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ecran?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { ecran = "accueil" } = await searchParams;
  const appearance = await getAppearance();
  const target = { min: 0.25, max: 0.5 };
  const rate = weeklyRate(SAMPLE_WEIGHTS, SAMPLE_DAY);
  const weight = {
    today: SAMPLE_DAY,
    entries: SAMPLE_WEIGHTS,
    average7: movingAverage(SAMPLE_WEIGHTS, SAMPLE_DAY),
    rate,
    status: rateStatus(rate, target),
    target,
    alert: paceAlert(SAMPLE_WEIGHTS, SAMPLE_DAY, target),
  };
  const week = currentWeek(SAMPLE_DAY, SAMPLE_SETS.filter((x, i, all) => all.findIndex((y) => y.workoutId === x.workoutId) === i).map((x) => x.date), [1, 3, 5]);

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
        ) : ecran === "progres" ? (
          <>
            <PageHeader title="Progrès" />
            <ProgressTabs current="/progres" />
            <WeightView weight={weight} period="3m" unit="kg" />
          </>
        ) : ecran === "progres-mensurations" ? (
          <>
            <PageHeader title="Progrès" />
            <ProgressTabs current="/progres/mensurations" />
            <MeasurementsView rows={SAMPLE_MEASUREMENTS} />
          </>
        ) : ecran === "progres-saisie" ? (
          <>
            <PageHeader back="/apercu?ecran=progres-mensurations" title="Mensurations" />
            <div className="grid gap-4 md:max-w-2xl">
              <MeasurementTips />
              <MeasurementsForm
                action={saveMeasurements}
                date={SAMPLE_DAY}
                today={SAMPLE_DAY}
                minDate={addDays(SAMPLE_DAY, -730)}
                current={{ bras: 38.2 }}
                latest={Object.fromEntries(SAMPLE_MEASUREMENTS.map((m) => [m.site, m.cm]))}
              />
            </div>
          </>
        ) : ecran === "progres-photos" ? (
          <>
            <PageHeader title="Progrès" />
            <ProgressTabs current="/progres/photos" />
            <PhotosView photos={SAMPLE_PHOTOS} />
          </>
        ) : ecran === "progres-photo-ajout" ? (
          <>
            <PageHeader back="/apercu?ecran=progres-photos" title="Ajouter une photo" />
            <div className="grid gap-4 md:max-w-xl">
              <p className="text-[14px] text-muted">
                Pour comparer d&apos;une fois sur l&apos;autre : même lumière, même endroit, même distance, de préférence le matin.
              </p>
              <PhotoForm action={uploadPhoto} today={SAMPLE_DAY} minDate={addDays(SAMPLE_DAY, -730)} />
            </div>
          </>
        ) : ecran === "progres-comparer" ? (
          <>
            <PageHeader back="/apercu?ecran=progres-photos" title="Comparer" />
            <CompareView pose="face" all={SAMPLE_PHOTOS} />
          </>
        ) : ecran === "progres-force" ? (
          <>
            <PageHeader title="Progrès" />
            <ProgressTabs current="/progres/force" />
            <StrengthView sets={SAMPLE_SETS} names={SAMPLE_EXERCISE_NAMES} start={addDays(weekStart(SAMPLE_DAY), -77)} today={SAMPLE_DAY} unit="kg" />
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
        ) : ecran === "nutrition" ? (
          <>
            <PageHeader title="Nutrition" />
            <NutritionDay day="2026-11-07" today="2026-11-07" dayType="entrainement" entries={SAMPLE_TODAY} previous={SAMPLE_YESTERDAY} targets={SAMPLE_TARGETS} />
          </>
        ) : ecran === "nutrition-vide" ? (
          <>
            <PageHeader title="Nutrition" />
            <NutritionDay day="2026-11-05" today="2026-11-07" dayType="repos" entries={[]} previous={[]} targets={{}} />
          </>
        ) : ecran === "nutrition-ajouter" ? (
          <>
            <PageHeader title="Ajouter" back="/apercu?ecran=nutrition" />
            <div className="grid gap-5 md:max-w-xl">
              <MealTabs meal="diner" day="2026-11-07" today="2026-11-07" basePath="/apercu" />
              <FoodPicker foods={SAMPLE_FOODS} params="repas=diner">
                <QuickPicks favorites={SAMPLE_FAVORITES} frequent={SAMPLE_FREQUENT} meal="diner" day="2026-11-07" params="repas=diner" />
              </FoodPicker>
            </div>
          </>
        ) : ecran === "nutrition-quantite" ? (
          <>
            <PageHeader title="Flocons d'avoine" eyebrow="Petit-déjeuner" back="/apercu?ecran=nutrition-ajouter" />
            <div className="grid gap-5 md:max-w-xl">
              <Per100 food={SAMPLE_FOODS[0]} />
              <GramsForm food={SAMPLE_FOODS[0]} defaultGrams={80} lastGrams={80} action={addFoodLog} hidden={{}} submitLabel="Ajouter au petit-déjeuner" />
            </div>
          </>
        ) : ecran === "nutrition-cibles" ? (
          <>
            <PageHeader title="Cibles" back="/apercu?ecran=nutrition" />
            <div className="grid gap-4 md:max-w-xl">
              <TargetsForm
                current={{}}
                trainingDays={[1, 3, 5]}
                suggestion={{ maintenance: 2750, entrainement: { kcal: 3150, proteinG: 150 }, repos: { kcal: 2850, proteinG: 150 } }}
              />
            </div>
          </>
        ) : ecran === "nutrition-aliment" ? (
          <>
            <PageHeader title="Nouvel aliment" back="/apercu?ecran=nutrition-ajouter" />
            <div className="md:max-w-xl">
              <FoodForm action={createFood} defaultName="Granola" submitLabel="Créer et choisir la quantité" />
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
              <div className="grid content-start gap-4">
                <Card className="grid gap-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">Pesée du jour</h2>
                    <span className="text-sm font-medium text-accent-text">Courbe</span>
                  </div>
                  <QuickWeigh initial={weight.entries[0].kg} unit="kg" loggedToday={false} />
                  <WeightTrend average7={weight.average7} rate={weight.rate} status={weight.status} target={target} unit="kg" />
                  {weight.alert ? <PaceAlertNotice alert={weight.alert} target={target} unit="kg" /> : null}
                </Card>
                <WeekCard days={week.days} done={week.done} planned={4} />
              </div>
              <div className="grid content-start gap-4">
                <Card className="grid gap-2">
                  <p className="label-caps flex items-center gap-1.5">
                    <FlagIcon size={14} weight="fill" aria-hidden="true" /> Objectif
                  </p>
                  <h2 className="font-title text-[26px]">Prise de masse</h2>
                  <p className="text-[15px] text-muted">Rythme visé : 0,25 à 0,5 kg par semaine.</p>
                </Card>
                <TodayNutritionCard totals={sumNutrients(SAMPLE_TODAY.map((e) => e.nutrients))} target={SAMPLE_TARGETS.entrainement} dayType="entrainement" />
                <Card className="grid gap-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">Volume, 8 semaines</h2>
                    <span className="text-sm font-medium text-accent-text">Force</span>
                  </div>
                  <WeeklyVolume weeks={weeklyVolume(SAMPLE_SETS, SAMPLE_DAY, 8)} unit="kg" table={false} className="h-28" />
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
