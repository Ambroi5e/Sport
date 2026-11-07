import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FoodForm } from "@/components/nutrition/food-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { archiveFood, updateFood } from "../../actions";
import { getFood } from "../../data";

export const metadata: Metadata = { title: "Modifier l'aliment" };

/** Corriger un aliment perso corrige aussi les jours où il a été noté. */
export default async function EditFoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const food = await getFood(id);
  if (!food.personal) notFound();
  return (
    <>
      <PageHeader title={food.name} back="/nutrition/aliments" />
      <div className="grid gap-5 md:max-w-xl">
        <p className="text-[14px] text-muted">Une correction s&apos;applique aussi aux jours où tu as déjà noté cet aliment.</p>
        <FoodForm action={updateFood.bind(null, food.id)} food={food} submitLabel="Enregistrer" />
        <ConfirmAction
          action={archiveFood.bind(null, food.id)}
          label="Retirer de mes aliments"
          confirmLabel="Retirer"
          question={`Retirer ${food.name} de tes aliments ? Il ne sera plus proposé, mais reste dans les jours où tu l'as noté.`}
        />
      </div>
    </>
  );
}
