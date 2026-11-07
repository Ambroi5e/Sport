import { PlusIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { archiveRecipe, saveRecipe } from "../../actions";
import { getIngredients, getRecipe } from "../../data";

export const metadata: Metadata = { title: "Recette" };

/** Modifier une recette corrige aussi les jours où elle a été notée. */
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [recipe, ingredients] = await Promise.all([getRecipe(id), getIngredients()]);
  return (
    <>
      <PageHeader title={recipe.food.name} eyebrow="Recette" back="/nutrition/recettes" />
      <div className="grid gap-6 md:max-w-4xl">
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <p className="text-[14px] text-muted">Une correction s&apos;applique aussi aux jours où tu as déjà noté cette recette.</p>
          <Link href={`/nutrition/ajouter/${recipe.food.id}`} className={buttonClasses("primary", "md", "shrink-0")}>
            <PlusIcon size={18} weight="bold" aria-hidden="true" /> Noter une part
          </Link>
        </div>
        <RecipeEditor
          action={saveRecipe.bind(null, recipe.food.id)}
          ingredients={ingredients}
          initial={{ name: recipe.food.name, portions: recipe.portions, cookedG: recipe.cookedG, items: recipe.items }}
          submitLabel="Enregistrer"
        />
        <ConfirmAction
          action={archiveRecipe.bind(null, recipe.food.id)}
          label="Retirer cette recette"
          confirmLabel="Retirer"
          question={`Retirer ${recipe.food.name} de tes recettes ? Elle ne sera plus proposée, mais reste dans les jours où tu l'as notée.`}
        />
      </div>
    </>
  );
}
