import { ForkKnifeIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { MealNeedsForm } from "@/components/groceries/meal-needs-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { MEAL_DAYS } from "@/lib/groceries";
import { addFromMeals } from "../actions";
import { getEaten, getPrices, getShoppingList, mealNeeds } from "../data";

export const metadata: Metadata = { title: "Depuis mes repas" };

export default async function FromMealsPage() {
  const profile = (await getProfile())!;
  const [eaten, prices, list] = await Promise.all([getEaten(localDate(profile.timezone)), getPrices(), getShoppingList()]);
  const needs = mealNeeds(eaten, prices, list);
  return (
    <>
      <PageHeader title="Depuis mes repas" eyebrow="Courses" back="/courses" />
      <div className="grid gap-4 md:max-w-xl">
        {needs.length ? (
          <>
            <p className="text-[15px] text-muted">
              Ce que tu as noté ces {MEAL_DAYS} derniers jours{eaten.days < MEAL_DAYS ? ` (${eaten.days} jour${eaten.days > 1 ? "s" : ""} avec des repas)` : ""}, recettes dépliées en
              ingrédients, arrondi à une quantité d&apos;achat. Décoche ce que tu as déjà chez toi.
            </p>
            <MealNeedsForm needs={needs} action={addFromMeals} />
          </>
        ) : (
          <EmptyState icon={<ForkKnifeIcon size={22} />} title="Rien de noté cette semaine">
            Dès que tu notes tes repas dans Nutrition, Fonte additionne ce que tu manges et te propose la liste correspondante.
          </EmptyState>
        )}
      </div>
    </>
  );
}
