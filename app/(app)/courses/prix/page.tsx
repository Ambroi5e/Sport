import { TagIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { PricesForm } from "@/components/groceries/budget-forms";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { MEAL_DAYS } from "@/lib/groceries";
import { savePrices } from "../actions";
import { getEaten, getPrices } from "../data";

export const metadata: Metadata = { title: "Prix au kilo" };

export default async function PricesPage() {
  const profile = (await getProfile())!;
  const [eaten, prices] = await Promise.all([getEaten(localDate(profile.timezone)), getPrices()]);
  const foods = eaten.ingredients.map((e) => ({ foodId: e.foodId, name: e.name, pricePerKg: prices.get(e.foodId) ?? null }));
  return (
    <>
      <PageHeader title="Prix au kilo" eyebrow="Courses" back="/courses/budget" />
      <div className="grid gap-4 md:max-w-xl">
        {foods.length ? (
          <>
            <p className="text-[15px] text-muted">
              Les aliments de tes {MEAL_DAYS} derniers jours, du plus mangé au moins mangé. Quelques prix suffisent : ils servent à estimer ta liste et ce que tu dépenses par jour.
            </p>
            <PricesForm foods={foods} action={savePrices} />
          </>
        ) : (
          <EmptyState icon={<TagIcon size={22} />} title="Aucun aliment à chiffrer pour l'instant">
            Les aliments apparaissent ici dès que tu notes tes repas dans Nutrition.
          </EmptyState>
        )}
      </div>
    </>
  );
}
