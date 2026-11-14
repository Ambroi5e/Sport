import { BarbellIcon, CalendarCheckIcon, FlagIcon, PlusIcon } from "@phosphor-icons/react/ssr";
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
import { PreferenceToggle } from "@/components/training/preference-toggle";
import { ProgramForm } from "@/components/training/program-form";
import { ProgramNextCard } from "@/components/training/program-next-card";
import { ProgramView } from "@/components/training/program-view";
import { ReplaceForm } from "@/components/training/replace-form";
import { startWorkout } from "@/app/(app)/entrainement/actions";
import { createProgram, endProgram, replaceProgramItem, setExercisePreference } from "@/app/(app)/entrainement/programme/actions";
import { goalOptions } from "@/lib/program";
import { SessionSettings } from "@/components/settings/session-settings";
import { DataPrivacyCard } from "@/components/settings/data-privacy-card";
import { DeleteAccountView } from "@/components/settings/delete-account-view";
import DataPage from "@/app/(app)/reglages/donnees/page";
import { deleteAccount } from "@/app/(app)/reglages/actions";
import { FoodForm } from "@/components/nutrition/food-form";
import { FoodPicker } from "@/components/nutrition/food-picker";
import { MealTabs } from "@/components/nutrition/meal-tabs";
import { GramsForm } from "@/components/nutrition/grams-form";
import { NutritionDay } from "@/components/nutrition/nutrition-day";
import { Per100 } from "@/components/nutrition/per-100";
import { QuickPicks } from "@/components/nutrition/quick-picks";
import { TargetsForm } from "@/components/nutrition/targets-form";
import { TodayNutritionCard } from "@/components/nutrition/today-card";
import { addFoodLog, createFood, saveRecipe } from "@/app/(app)/nutrition/actions";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import { LabelReader } from "@/components/nutrition/label-reader";
import { RealTdeeCard } from "@/components/nutrition/real-tdee-card";
import { ScanNotice } from "@/components/nutrition/scan-notice";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { RecipeList } from "@/components/nutrition/recipe-list";
import { buttonClasses } from "@/components/ui/button";
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
import { CheckinCard } from "@/components/progress/checkin-card";
import { ReadinessView } from "@/components/progress/readiness-view";
import { ActivitiesView } from "@/components/training/activities-view";
import { ActivityForm } from "@/components/training/activity-form";
import { ActivityRepeat } from "@/components/training/activity-repeat";
import { saveActivity } from "@/app/(app)/entrainement/sports/actions";
import { saveCheckin } from "@/app/(app)/progres/forme/actions";
import { GroupBoard } from "@/components/friends/group-board";
import { GroupForm } from "@/components/friends/group-form";
import { createGroupSession, endGroupSession, joinGroupSession, leaveGroupSession } from "@/app/(app)/amis/seance/actions";
import { FriendsView } from "@/components/friends/friends-view";
import { FriendView } from "@/components/friends/friend-view";
import { acceptFriendInvite, createFriendInvite, removeFriend, setShare } from "@/app/(app)/amis/actions";
import { MoveSession } from "@/components/training/move-session";
import { WeekPlanView } from "@/components/training/week-plan-view";
import { WeekTypeView } from "@/components/training/week-type-view";
import { addWeeklySport, deleteWeeklySport, freeDay, moveSession, postponeSession, resetSession, saveAvailableDays } from "@/app/(app)/entrainement/semaine/actions";
import { ADAPT_HINTS } from "@/lib/planning";
import { moveOptions, todayOptions, type Checkin } from "@/lib/engine";
import type { Sport } from "@/lib/sports";
import { addDays, weekStart } from "@/lib/dates";
import { currentWeek, movingAverage, paceAlert, rateStatus, sumNutrients, weeklyRate, weeklyVolume } from "@/lib/engine";
import {
  SAMPLE_ACTIVITIES,
  SAMPLE_BUDGET_WEEK,
  SAMPLE_MEAL_NEEDS,
  SAMPLE_PURCHASES,
  SAMPLE_SHOPPING,
  SAMPLE_STOCK,
  SAMPLE_SUPPLEMENTS,
  SAMPLE_BLOCKS,
  SAMPLE_CHECKINS,
  SAMPLE_DAY,
  SAMPLE_EXERCISE_NAMES,
  SAMPLE_EXERCISES,
  SAMPLE_FAVORITES,
  SAMPLE_FOODS,
  SAMPLE_FREQUENT,
  SAMPLE_FRIEND_DATA,
  SAMPLE_FRIENDS,
  SAMPLE_GROUP,
  SAMPLE_GROUP_INVITED,
  SAMPLE_GROUP_NOW,
  SAMPLE_HISTORY,
  SAMPLE_ITEMS,
  SAMPLE_MEASUREMENTS,
  SAMPLE_PHOTOS,
  SAMPLE_INGREDIENTS,
  SAMPLE_LOAD,
  SAMPLE_PLAN,
  SAMPLE_PLAN_DAY,
  SAMPLE_PLAN_INPUT,
  SAMPLE_WEEKLY_SPORTS,
  SAMPLE_LABEL,
  SAMPLE_OFF,
  SAMPLE_OFF_PREFILL,
  SAMPLE_PROGRAM,
  SAMPLE_REAL_TDEE,
  SAMPLE_REAL_TDEE_WAITING,
  SAMPLE_RECIPE,
  SAMPLE_RECIPES,
  SAMPLE_REPLACE,
  SAMPLE_SETS,
  SAMPLE_TARGETS,
  SAMPLE_TODAY,
  SAMPLE_VOLUME,
  SAMPLE_WEIGHTS,
  SAMPLE_YESTERDAY,
} from "./exemples";
import { AddItemForm } from "@/components/groceries/add-item-form";
import { BudgetCard, BudgetSummary } from "@/components/groceries/budget-card";
import { BudgetForm, PricesForm, PurchaseForm } from "@/components/groceries/budget-forms";
import { DayCostCard } from "@/components/groceries/day-cost-card";
import { ItemForm } from "@/components/groceries/item-form";
import { MealNeedsForm } from "@/components/groceries/meal-needs-form";
import { PurchaseList } from "@/components/groceries/purchase-list";
import { ShoppingList } from "@/components/groceries/shopping-list";
import { addFromMeals, addItem, addPurchase, addStockItem, clearChecked, deletePurchase, finishStockItem, savePrices, setBudget, storeChecked, toggleItem, updateItem, updateStockItem } from "@/app/(app)/courses/actions";
import { budgetStatus } from "@/lib/engine";
import { ForkKnifeIcon, PackageIcon } from "@phosphor-icons/react/ssr";
import { AddStockForm, StockItemForm } from "@/components/groceries/stock-forms";
import { StockList } from "@/components/groceries/stock-list";
import Link from "next/link";
import { SupplementForm } from "@/components/supplements/supplement-form";
import { SupplementsView } from "@/components/supplements/supplements-view";
import { TodaySupplementsCard } from "@/components/supplements/today-card";
import { addSupplement, toggleTaken, updateSupplement } from "@/app/(app)/nutrition/complements/actions";
import { SUPPLEMENT_NOTICE } from "@/lib/supplements";
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
  const week = currentWeek(
    SAMPLE_DAY,
    SAMPLE_SETS.filter((x, i, all) => all.findIndex((y) => y.workoutId === x.workoutId) === i).map((x) => x.date),
    [1, 3, 5],
    SAMPLE_ACTIVITIES.map((a) => a.date),
  );
  const todayCheckin = SAMPLE_CHECKINS.find((c) => c.date === SAMPLE_DAY) ?? null;
  const middling: Checkin = { sleep: 2, soreness: 4, energy: 3, stress: 3 };
  const low: Checkin = { sleep: 1, soreness: 3, energy: 1, stress: 4 };
  const sportOrder: Sport[] = ["padel", "foot", "escalade", "tennis", "squash", "badminton", "basket", "handball", "rugby", "volley", "combat", "autre"];

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
              <DataPrivacyCard />
            </div>
          </>
        ) : ecran === "donnees" ? (
          <DataPage />
        ) : ecran === "supprimer" ? (
          <>
            <PageHeader title="Supprimer mon compte" back="/apercu?ecran=reglages" />
            <DeleteAccountView summary={["48 séances", "1 214 aliments notés", "96 pesées", "12 photos"]} admin action={deleteAccount} exportHref="/apercu?ecran=donnees" />
          </>
        ) : ecran === "semaine" || ecran === "semaine-forme" || ecran === "semaine-basse" ? (
          <>
            <PageHeader back="/apercu?ecran=entrainement" eyebrow="jeudi 5 novembre" title="Ma semaine" />
            <WeekPlanView
              data={{
                today: SAMPLE_PLAN_DAY,
                plan: SAMPLE_PLAN,
                options: todayOptions(SAMPLE_PLAN_INPUT, SAMPLE_PLAN, ecran === "semaine-forme" ? middling : ecran === "semaine-basse" ? low : null, SAMPLE_LOAD.ratio),
                load: SAMPLE_LOAD,
                availableDays: SAMPLE_PLAN_INPUT.availableDays,
                weeklySports: SAMPLE_WEEKLY_SPORTS,
                hasProgram: true,
                active: null,
              }}
              actions={{
                start: startWorkout,
                move: (id) => moveSession.bind(null, id),
                postpone: (id) => postponeSession.bind(null, id),
                free: (date) => freeDay.bind(null, date),
              }}
              moveHref={() => "/apercu?ecran=semaine-deplacer"}
              typeHref="/apercu?ecran=semaine-type"
              programHref="/apercu?ecran=programme"
              checkinHref="/apercu?ecran=forme"
              workoutHref={() => "/apercu?ecran=seance"}
            />
          </>
        ) : ecran === "semaine-deplacer" ? (
          <>
            <PageHeader back="/apercu?ecran=semaine" eyebrow="Déplacer" title="Bas B" />
            <div className="md:max-w-xl">
              <MoveSession
                options={moveOptions(SAMPLE_PLAN_INPUT, "seance-3")}
                today={SAMPLE_PLAN_DAY}
                pinned
                moveAction={moveSession.bind(null, "apercu")}
                resetAction={resetSession.bind(null, "apercu")}
              />
            </div>
          </>
        ) : ecran === "semaine-type" ? (
          <>
            <PageHeader back="/apercu?ecran=semaine" eyebrow="Ma semaine" title="Semaine type" />
            <WeekTypeView
              availableDays={SAMPLE_PLAN_INPUT.availableDays}
              weeklySports={SAMPLE_WEEKLY_SPORTS}
              sports={sportOrder}
              defaults={{ sport: "padel", minutes: 90, intensity: "moderee" }}
              saveDaysAction={saveAvailableDays}
              addSportAction={addWeeklySport}
              deleteSportAction={(id) => deleteWeeklySport.bind(null, id)}
            />
          </>
        ) : ecran === "courses" || ecran === "courses-vide" || ecran === "courses-sans-budget" ? (
          <>
            <PageHeader title="Courses" />
            <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
              <div className="grid gap-5 md:order-2">
                <BudgetCard
                  budget={ecran === "courses" ? 50 : null}
                  status={budgetStatus(ecran === "courses" ? 50 : null, ecran === "courses" ? SAMPLE_PURCHASES : [], SAMPLE_BUDGET_WEEK)}
                  href="/apercu?ecran=courses-budget"
                />
                <AddItemForm action={addItem} />
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/apercu?ecran=courses-repas" className={buttonClasses("secondary", "md", "px-2")}>
                    <ForkKnifeIcon size={18} aria-hidden="true" /> Depuis mes repas
                  </Link>
                  <Link href="/apercu?ecran=stock" className={buttonClasses("secondary", "md", "px-2")}>
                    <PackageIcon size={18} aria-hidden="true" /> Mon stock
                  </Link>
                </div>
              </div>
              <ShoppingList
                items={ecran === "courses-vide" ? [] : SAMPLE_SHOPPING}
                itemHref={() => "/apercu?ecran=courses-article"}
                toggleAction={toggleItem}
                clearAction={clearChecked}
                storeAction={storeChecked}
              />
            </div>
          </>
        ) : ecran === "courses-article" ? (
          <>
            <PageHeader title={SAMPLE_SHOPPING[2].name} eyebrow="Courses" back="/apercu?ecran=courses" />
            <div className="grid gap-6 md:max-w-xl">
              <ItemForm item={SAMPLE_SHOPPING[2]} action={updateItem.bind(null, "apercu")} />
            </div>
          </>
        ) : ecran === "courses-repas" ? (
          <>
            <PageHeader title="Depuis mes repas" eyebrow="Courses" back="/apercu?ecran=courses" />
            <div className="grid gap-4 md:max-w-xl">
              <p className="text-[15px] text-muted">
                Ce que tu as noté ces 7 derniers jours, recettes dépliées en ingrédients, arrondi à une quantité d&apos;achat. Ton stock est déduit ; décoche ce que tu as déjà chez toi.
              </p>
              <MealNeedsForm needs={SAMPLE_MEAL_NEEDS} action={addFromMeals} />
            </div>
          </>
        ) : ecran === "courses-budget" || ecran === "courses-budget-vide" ? (
          <>
            <PageHeader title="Budget" eyebrow="Courses" back="/apercu?ecran=courses" />
            <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-6">
              <div className="grid gap-4">
                <Card className="grid gap-5">
                  <BudgetSummary
                    budget={ecran === "courses-budget" ? 50 : null}
                    status={budgetStatus(ecran === "courses-budget" ? 50 : null, ecran === "courses-budget" ? SAMPLE_PURCHASES : [], SAMPLE_BUDGET_WEEK)}
                  />
                  <BudgetForm budget={ecran === "courses-budget" ? 50 : null} action={setBudget} />
                </Card>
                <DayCostCard
                  cost={ecran === "courses-budget" ? { perDay: 6.84, coverage: 0.78 } : { perDay: null, coverage: 0.22 }}
                  days={ecran === "courses-budget" ? 7 : 3}
                  pricesHref="/apercu?ecran=courses-prix"
                />
              </div>
              <div className="grid gap-4">
                <Card className="grid gap-4">
                  <h2 className="text-lg font-semibold">Noter un achat</h2>
                  <PurchaseForm today={SAMPLE_DAY} action={addPurchase} />
                </Card>
                <section aria-labelledby="achats-titre" className="grid gap-2">
                  <h2 id="achats-titre" className="label-caps">
                    Achats des cinq dernières semaines
                  </h2>
                  <PurchaseList purchases={ecran === "courses-budget" ? SAMPLE_PURCHASES : []} deleteAction={deletePurchase} />
                </section>
              </div>
            </div>
          </>
        ) : ecran === "courses-prix" ? (
          <>
            <PageHeader title="Prix au kilo" eyebrow="Courses" back="/apercu?ecran=courses-budget" />
            <div className="grid gap-4 md:max-w-xl">
              <p className="text-[15px] text-muted">
                Les aliments de tes 7 derniers jours, du plus mangé au moins mangé. Quelques prix suffisent : ils servent à estimer ta liste et ce que tu dépenses par jour.
              </p>
              <PricesForm foods={SAMPLE_MEAL_NEEDS} action={savePrices} />
            </div>
          </>
        ) : ecran === "stock" || ecran === "stock-vide" ? (
          <>
            <PageHeader title="Mon stock" eyebrow="Courses" back="/apercu?ecran=courses" />
            <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
              <StockList items={ecran === "stock" ? SAMPLE_STOCK : []} today={SAMPLE_DAY} itemHref={() => "/apercu?ecran=stock-article"} finishAction={finishStockItem} />
              <Card className="grid gap-4">
                <h2 className="text-lg font-semibold">Ajouter au stock</h2>
                <AddStockForm action={addStockItem} />
              </Card>
            </div>
          </>
        ) : ecran === "stock-article" ? (
          <>
            <PageHeader title={SAMPLE_STOCK[1].name} eyebrow="Mon stock" back="/apercu?ecran=stock" />
            <div className="md:max-w-xl">
              <StockItemForm item={SAMPLE_STOCK[1]} action={updateStockItem.bind(null, "apercu")} />
            </div>
          </>
        ) : ecran === "complements" || ecran === "complements-vide" ? (
          <>
            <PageHeader title="Compléments" eyebrow="Nutrition" back="/apercu?ecran=nutrition" />
            <SupplementsView
              supplements={ecran === "complements" ? SAMPLE_SUPPLEMENTS : []}
              editHref={() => "/apercu?ecran=complement"}
              newHref="/apercu?ecran=complement-nouveau"
              toggleAction={toggleTaken}
            />
          </>
        ) : ecran === "complement" || ecran === "complement-nouveau" ? (
          <>
            <PageHeader title={ecran === "complement" ? SAMPLE_SUPPLEMENTS[1].name : "Nouveau complément"} eyebrow="Compléments" back="/apercu?ecran=complements" />
            <div className="grid gap-5 md:max-w-xl">
              {ecran === "complement" ? (
                <SupplementForm supplement={SAMPLE_SUPPLEMENTS[1]} action={updateSupplement.bind(null, "apercu")} submitLabel="Enregistrer" />
              ) : (
                <SupplementForm action={addSupplement} submitLabel="Ajouter" />
              )}
              <p className="text-[13px] text-muted">{SUPPLEMENT_NOTICE}</p>
            </div>
          </>
        ) : ecran === "amis" || ecran === "amis-vide" ? (
          <>
            <PageHeader back="/apercu" title="Amis" />
            <FriendsView
              friends={ecran === "amis" ? SAMPLE_FRIENDS : []}
              friendHref={(id) => `/apercu?ecran=${id === "ami-ines" ? "ami-nouveau" : "ami"}`}
              sessions={ecran === "amis" ? [{ id: "sc-1", name: "Samedi matin", joined: false, mine: false }] : []}
              groupHref={() => "/apercu?ecran=seance-commune-invitation"}
              newGroupHref="/apercu?ecran=seance-commune-nouvelle"
              inviteAction={createFriendInvite}
              acceptAction={acceptFriendInvite}
            />
          </>
        ) : ecran === "ami" || ecran === "ami-nouveau" ? (
          <>
            <PageHeader back="/apercu?ecran=amis" eyebrow="Ami" title={SAMPLE_FRIENDS[ecran === "ami" ? 2 : 0].name} />
            <FriendView
              friend={SAMPLE_FRIENDS[ecran === "ami" ? 2 : 0]}
              data={ecran === "ami" ? SAMPLE_FRIEND_DATA : { workouts: [], activities: [], records: [], weights: [], measurements: [], nutrition: [], checkins: [] }}
              unit="kg"
              today={SAMPLE_DAY}
              welcome={ecran === "ami-nouveau"}
              shareAction={(category, shown) => setShare.bind(null, "apercu", category, shown)}
              removeAction={removeFriend.bind(null, "apercu")}
            />
          </>
        ) : ecran === "seance-commune" || ecran === "seance-commune-invitation" ? (
          <>
            <PageHeader back="/apercu?ecran=amis" eyebrow="Séance commune" title="Samedi matin" />
            <GroupBoard
              session={ecran === "seance-commune" ? SAMPLE_GROUP : SAMPLE_GROUP_INVITED}
              unit="kg"
              now={SAMPLE_GROUP_NOW}
              workoutHref="/apercu?ecran=seance"
              joinAction={joinGroupSession.bind(null, "apercu")}
              leaveAction={leaveGroupSession.bind(null, "apercu")}
              endAction={endGroupSession.bind(null, "apercu")}
            />
          </>
        ) : ecran === "seance-commune-nouvelle" ? (
          <>
            <PageHeader back="/apercu?ecran=amis" eyebrow="Amis" title="Séance commune" />
            <div className="md:max-w-xl">
              <Card>
                <GroupForm friends={SAMPLE_FRIENDS.map((f) => ({ id: f.id, name: f.name }))} action={createGroupSession} />
              </Card>
            </div>
          </>
        ) : ecran === "sports" ? (
          <>
            <PageHeader title="Sports" back="/apercu" />
            <ActivitiesView activities={SAMPLE_ACTIVITIES} today={SAMPLE_DAY} addHref="/apercu?ecran=sport-ajouter" itemHref={() => "/apercu?ecran=sport-ajouter"} />
          </>
        ) : ecran === "sports-vide" ? (
          <>
            <PageHeader title="Sports" back="/apercu" />
            <ActivitiesView activities={[]} today={SAMPLE_DAY} addHref="/apercu?ecran=sport-ajouter" itemHref={() => "/apercu"} />
          </>
        ) : ecran === "sport-ajouter" ? (
          <>
            <PageHeader title="Noter un sport" back="/apercu?ecran=sports" />
            <div className="grid gap-6 md:max-w-2xl">
              <ActivityRepeat action={saveActivity.bind(null, null)} last={SAMPLE_ACTIVITIES[0]} today={SAMPLE_DAY} />
              <h2 className="text-lg font-semibold">Ou autre chose</h2>
              <ActivityForm
                action={saveActivity.bind(null, null)}
                defaults={{ sport: "padel", label: "", minutes: 90, intensity: "intense", date: SAMPLE_DAY }}
                sports={sportOrder}
                today={SAMPLE_DAY}
                weightKg={SAMPLE_ACTIVITIES[0].weightKg}
              />
            </div>
          </>
        ) : ecran === "forme" ? (
          <>
            <PageHeader title="Progrès" />
            <ProgressTabs current="/progres/forme" />
            <ReadinessView checkins={SAMPLE_CHECKINS} today={SAMPLE_DAY} period="1m" checkin={<CheckinCard action={saveCheckin} current={todayCheckin} />} />
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
        ) : ecran === "programme" ? (
          <>
            <PageHeader back="/apercu?ecran=entrainement" eyebrow="Programme" title={SAMPLE_PROGRAM.name} />
            <ProgramView data={SAMPLE_PROGRAM} unit="kg" startAction={startWorkout} endAction={endProgram.bind(null, "apercu")} />
          </>
        ) : ecran === "programme-vide" ? (
          <>
            <PageHeader back="/apercu?ecran=entrainement" title="Programme" />
            <div className="grid gap-4 md:max-w-2xl">
              <EmptyState icon={<CalendarCheckIcon size={22} />} title="Pas de programme en cours">
                Dis à Fonte combien de séances tu fais, combien de temps, avec quel matériel et ce que tu veux faire progresser : il te génère tes séances, te
                propose la charge du jour à chaque séance et te montre où tu en es face à ton objectif.
              </EmptyState>
            </div>
          </>
        ) : ecran === "programme-nouveau" ? (
          <>
            <PageHeader back="/apercu?ecran=programme-vide" title="Nouveau programme" />
            <div className="grid gap-4 md:max-w-2xl">
              <Card>
                <ProgramForm action={createProgram} defaults={{ sessions: 4 }} goalOptions={goalOptions(SAMPLE_EXERCISES)} unit="kg" minDate="2026-11-08" />
              </Card>
            </div>
          </>
        ) : ecran === "programme-remplacer" ? (
          <>
            <PageHeader back="/apercu?ecran=programme" eyebrow="Haut A" title="Remplacer un exercice" />
            <div className="grid gap-4 md:max-w-2xl">
              <Card className="grid gap-1">
                <p className="label-caps">Actuellement</p>
                <p className="font-title text-[22px]">Développé couché</p>
                <p className="text-[14px] text-muted">4 × 6–10 · Pectoraux</p>
              </Card>
              <Card>
                <ReplaceForm action={replaceProgramItem.bind(null, "apercu")} current="Développé couché" options={SAMPLE_REPLACE} />
              </Card>
            </div>
          </>
        ) : ecran === "entrainement" ? (
          <>
            <PageHeader title="Entraînement" />
            <div className="grid gap-4 md:max-w-xl">
              <ProgramNextCard
                week={SAMPLE_PROGRAM.week}
                deload={false}
                session={{ id: "seance-2", name: SAMPLE_PROGRAM.sessions[2].name, exerciseNames: SAMPLE_PROGRAM.sessions[2].items.map((i) => i.name) }}
                when="Aujourd'hui"
                hint={ADAPT_HINTS.alleger}
                startAction={startWorkout}
              />
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
              <RealTdeeCard real={SAMPLE_REAL_TDEE} formulaKcal={2750} unit="kg" />
              <TargetsForm
                current={{}}
                trainingDays={[1, 3, 5]}
                suggestion={{ maintenance: 3200, entrainement: { kcal: 3350, proteinG: 150 }, repos: { kcal: 3000, proteinG: 150 } }}
                source="D'après ta dépense réelle"
              />
            </div>
          </>
        ) : ecran === "nutrition-cibles-attente" ? (
          <>
            <PageHeader title="Cibles" back="/apercu?ecran=nutrition" />
            <div className="grid gap-4 md:max-w-xl">
              <RealTdeeCard real={SAMPLE_REAL_TDEE_WAITING} formulaKcal={2750} unit="kg" />
              <TargetsForm
                current={SAMPLE_TARGETS}
                trainingDays={[1, 3, 5]}
                suggestion={{ maintenance: 2750, entrainement: { kcal: 3150, proteinG: 150 }, repos: { kcal: 2850, proteinG: 150 } }}
                source="D'après la formule de ton profil"
              />
            </div>
          </>
        ) : ecran === "nutrition-recettes" || ecran === "nutrition-recettes-vide" ? (
          <>
            <PageHeader title="Recettes" back="/apercu?ecran=nutrition" />
            <div className="grid gap-4 md:max-w-xl">
              <RecipeList recipes={ecran === "nutrition-recettes" ? SAMPLE_RECIPES : []} />
              <span className={buttonClasses(ecran === "nutrition-recettes" ? "secondary" : "primary", "md", "w-full")}>
                <PlusIcon size={18} weight="bold" aria-hidden="true" /> Créer une recette
              </span>
              <p className="text-[13px] text-muted">Une recette se retrouve aussi dans la recherche d&apos;aliments, et se note à la part ou au poids.</p>
            </div>
          </>
        ) : ecran === "nutrition-recette" ? (
          <>
            <PageHeader title={SAMPLE_RECIPE.name} eyebrow="Recette" back="/apercu?ecran=nutrition-recettes" />
            <div className="grid gap-6 md:max-w-4xl">
              <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
                <p className="text-[14px] text-muted">Une correction s&apos;applique aussi aux jours où tu as déjà noté cette recette.</p>
                <span className={buttonClasses("primary", "md", "shrink-0")}>
                  <PlusIcon size={18} weight="bold" aria-hidden="true" /> Noter une part
                </span>
              </div>
              <RecipeEditor action={saveRecipe.bind(null, null)} ingredients={SAMPLE_INGREDIENTS} initial={SAMPLE_RECIPE} submitLabel="Enregistrer" />
            </div>
          </>
        ) : ecran === "nutrition-recette-nouvelle" ? (
          <>
            <PageHeader title="Nouvelle recette" back="/apercu?ecran=nutrition-recettes" />
            <div className="md:max-w-4xl">
              <RecipeEditor action={saveRecipe.bind(null, null)} ingredients={SAMPLE_INGREDIENTS} submitLabel="Créer la recette" />
            </div>
          </>
        ) : ecran === "nutrition-quantite-recette" ? (
          <>
            <PageHeader title={SAMPLE_RECIPES[0].food.name} eyebrow="Déjeuner" back="/apercu?ecran=nutrition-ajouter" />
            <div className="grid gap-5 md:max-w-xl">
              <Per100 food={SAMPLE_RECIPES[0].food} />
              <GramsForm
                food={SAMPLE_RECIPES[0].food}
                defaultGrams={SAMPLE_RECIPES[0].food.portionG!}
                lastGrams={null}
                action={addFoodLog}
                hidden={{}}
                submitLabel="Ajouter au déjeuner"
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
        ) : ecran === "nutrition-scanner" ? (
          <>
            <PageHeader title="Scanner" back="/apercu?ecran=nutrition-ajouter" />
            <div className="md:max-w-xl">
              <BarcodeScanner query="repas=diner" />
            </div>
          </>
        ) : ecran === "nutrition-code-trouve" ? (
          <>
            <PageHeader title={SAMPLE_OFF.name} eyebrow="Code 3017620422003" back="/apercu?ecran=nutrition-scanner" />
            <div className="grid gap-5 md:max-w-xl">
              <ScanNotice code="3017620422003" kind="trouve" />
              <FoodForm action={createFood} hidden={{}} prefill={SAMPLE_OFF_PREFILL} submitLabel="Créer et choisir la quantité" />
            </div>
          </>
        ) : ecran === "nutrition-code-inconnu" ? (
          <>
            <PageHeader title="Nouveau produit" eyebrow="Code 3760123456784" back="/apercu?ecran=nutrition-scanner" />
            <div className="grid gap-5 md:max-w-4xl">
              <ScanNotice code="3760123456784" kind="inconnu" />
              <LabelReader action={createFood} hidden={{}} submitLabel="Créer et choisir la quantité" />
            </div>
          </>
        ) : ecran === "nutrition-etiquette" ? (
          <>
            <PageHeader title="Lire une étiquette" back="/apercu?ecran=nutrition-ajouter" />
            <div className="md:max-w-4xl">
              <LabelReader action={createFood} hidden={{}} submitLabel="Créer et choisir la quantité" sample={SAMPLE_LABEL} />
            </div>
          </>
        ) : ecran === "seance" ? (
          <>
            <PageHeader back="/apercu" eyebrow="samedi 7 novembre" title="Push A" />
            <WorkoutLogger
              userId="apercu"
              workoutId="apercu"
              blocks={SAMPLE_BLOCKS}
              history={SAMPLE_HISTORY}
              suggestions={{ 0: "Suggéré : 72,5 kg, une rep de plus par série jusqu'à 10, puis la charge monte." }}
              unit="kg"
              finished={false}
            />
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
              <Card>
                <PreferenceToggle action={setExercisePreference.bind(null, "apercu")} current="aime" />
              </Card>
              <RecordTiles tiles={recordTiles(SAMPLE_HISTORY["ex-dc"].records, "charge", "kg")} />
              <ExerciseForm />
            </div>
          </>
        ) : (
          <>
            <PageHeader eyebrow="sam. 7 nov." title="Salut Exemple" />
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
                <CheckinCard
                  action={saveCheckin}
                  current={ecran === "accueil-forme" ? middling : null}
                  link={<span className="text-sm font-medium text-accent-text">Courbe</span>}
                />
                <WeekCard
                  days={week.days}
                  done={week.done}
                  planned={4}
                  href="/apercu?ecran=semaine"
                  plan={{ today: "Haut A", hint: ecran === "accueil-forme" ? ADAPT_HINTS.alleger : null, next: null }}
                />
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
                <TodaySupplementsCard supplements={SAMPLE_SUPPLEMENTS} href="/apercu?ecran=complements" />
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
