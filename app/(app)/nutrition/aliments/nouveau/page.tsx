import type { Metadata } from "next";
import { FoodForm } from "@/components/nutrition/food-form";
import { PageHeader } from "@/components/ui/page-header";
import { isMeal } from "@/lib/nutrition";
import { createFood } from "../../actions";
import { addContext } from "../../context";

export const metadata: Metadata = { title: "Nouvel aliment" };

/** Venu de l'ajout d'un repas, on enchaîne ensuite sur la quantité. */
export default async function NewFoodPage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string; nom?: string }> }) {
  const search = await searchParams;
  const fromMeal = isMeal(search.repas);
  const { day, meal, params } = await addContext(search);
  return (
    <>
      <PageHeader title="Nouvel aliment" back={fromMeal ? `/nutrition/ajouter?${params}` : "/nutrition/aliments"} />
      <div className="md:max-w-xl">
        <FoodForm
          action={createFood}
          defaultName={search.nom?.slice(0, 80)}
          hidden={fromMeal ? { meal, day } : {}}
          submitLabel={fromMeal ? "Créer et choisir la quantité" : "Créer l'aliment"}
        />
      </div>
    </>
  );
}
