import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GramsForm } from "@/components/nutrition/grams-form";
import { PageHeader } from "@/components/ui/page-header";
import { addFoodLog } from "../../actions";
import { addContext } from "../../context";
import { getFood, getLastGrams } from "../../data";
import { Per100 } from "@/components/nutrition/per-100";
import { MEAL_LABELS, MEAL_TO } from "@/lib/nutrition";

export const metadata: Metadata = { title: "Quantité" };

/** Quantité préremplie : dernière fois, sinon la portion, sinon 100 g. */
export default async function FoodQuantityPage({
  params,
  searchParams,
}: {
  params: Promise<{ foodId: string }>;
  searchParams: Promise<{ repas?: string; jour?: string }>;
}) {
  const { foodId } = await params;
  if (!z.uuid().safeParse(foodId).success) notFound();
  const { day, meal, params: search } = await addContext(await searchParams);
  const [food, lastGrams] = await Promise.all([getFood(foodId), getLastGrams(foodId)]);

  return (
    <>
      <PageHeader title={food.name} eyebrow={MEAL_LABELS[meal]} back={`/nutrition/ajouter?${search}`} />
      <div className="grid gap-5 md:max-w-xl">
        <Per100 food={food} />
        <GramsForm
          food={food}
          defaultGrams={lastGrams ?? food.portionG ?? 100}
          lastGrams={lastGrams}
          action={addFoodLog}
          hidden={{ foodId: food.id, meal, day }}
          submitLabel={`Ajouter ${MEAL_TO[meal]}`}
        />
        {food.personal ? (
          <Link
            href={food.recipe ? `/nutrition/recettes/${food.id}` : `/nutrition/aliments/${food.id}`}
            className="justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline"
          >
            {food.recipe ? "Modifier la recette" : "Corriger les valeurs de cet aliment"}
          </Link>
        ) : null}
      </div>
    </>
  );
}
