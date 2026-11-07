import type { Metadata } from "next";
import { FoodPicker } from "@/components/nutrition/food-picker";
import { MealTabs } from "@/components/nutrition/meal-tabs";
import { QuickPicks } from "@/components/nutrition/quick-picks";
import { PageHeader } from "@/components/ui/page-header";
import { addDays } from "@/lib/dates";
import { dayHref, dayLabel } from "@/lib/nutrition";
import { addContext } from "../context";
import { getFoods, getFrequentFoods, getSavedMeals } from "../data";

export const metadata: Metadata = { title: "Ajouter un aliment" };

/**
 * Ajout au journal, du plus rapide au plus long : repas favori ou aliment
 * fréquent en un tap, sinon recherche puis quantité.
 */
export default async function AddFoodPage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string }> }) {
  const { today, day, meal, params } = await addContext(await searchParams);
  const [foods, frequent, saved] = await Promise.all([getFoods(), getFrequentFoods(today), getSavedMeals()]);
  // Les favoris de ce repas d'abord : le petit-déj favori en haut le matin.
  const favorites = [...saved].sort((a, b) => Number(b.meal === meal) - Number(a.meal === meal));

  return (
    <>
      <PageHeader title="Ajouter" eyebrow={day === today ? undefined : dayLabel(day, today, addDays(today, -1))} back={dayHref(day, today, meal)} />
      <div className="grid gap-5 md:max-w-xl">
        <MealTabs meal={meal} day={day} today={today} />

        <FoodPicker foods={foods} params={params}>
          <QuickPicks
            favorites={favorites.map((f) => ({ id: f.id, name: f.name, itemCount: f.items.length, totals: f.totals }))}
            frequent={frequent}
            meal={meal}
            day={day}
            params={params}
          />
        </FoodPicker>
      </div>
    </>
  );
}
