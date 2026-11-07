import { StarIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatGrams, formatKcal, formatMacro, MEAL_LABELS } from "@/lib/nutrition";
import { deleteSavedMeal } from "../actions";
import { getSavedMeals } from "../data";

export const metadata: Metadata = { title: "Repas favoris" };

export default async function SavedMealsPage() {
  const meals = await getSavedMeals();
  return (
    <>
      <PageHeader title="Repas favoris" back="/nutrition" />
      <div className="grid gap-4 md:max-w-xl">
        {meals.length ? (
          meals.map((m) => (
            <Card key={m.id} aria-labelledby={`favori-${m.id}`} className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`favori-${m.id}`} className="min-w-0 truncate text-lg font-semibold">
                  {m.name}
                </h2>
                <span className="shrink-0 text-[13px] text-muted">{MEAL_LABELS[m.meal]}</span>
              </div>
              <ul className="grid gap-1 text-[14px]">
                {m.items.map((i, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{i.food.name}</span>
                    <span className="shrink-0 text-muted">{formatGrams(i.grams)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[14px] text-muted">
                <span className="font-numeric text-[18px] text-text">{formatKcal(m.totals.kcal)}</span> kcal · {formatMacro(m.totals.proteinG)} g de protéines
              </p>
              <ConfirmAction action={deleteSavedMeal.bind(null, m.id)} label="Supprimer le favori" confirmLabel="Supprimer" question={`Supprimer le favori « ${m.name} » ? Les jours où tu l'as ajouté ne changent pas.`} />
            </Card>
          ))
        ) : (
          <EmptyState icon={<StarIcon size={22} />} title="Aucun repas favori">
            Note un repas que tu manges souvent, puis touche « Favori » sous ce repas : tu pourras ensuite le rajouter en un tap.
          </EmptyState>
        )}
      </div>
    </>
  );
}
