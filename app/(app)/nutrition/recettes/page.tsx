import { PlusIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { RecipeList } from "@/components/nutrition/recipe-list";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getRecipes } from "../data";

export const metadata: Metadata = { title: "Recettes" };

export default async function RecipesPage() {
  const recipes = await getRecipes();
  return (
    <>
      <PageHeader title="Recettes" back="/nutrition" />
      <div className="grid gap-4 md:max-w-xl">
        <RecipeList recipes={recipes} />
        <Link href="/nutrition/recettes/nouvelle" className={buttonClasses(recipes.length ? "secondary" : "primary", "md", "w-full")}>
          <PlusIcon size={18} weight="bold" aria-hidden="true" /> Créer une recette
        </Link>
        <p className="text-[13px] text-muted">Une recette se retrouve aussi dans la recherche d&apos;aliments, et se note à la part ou au poids.</p>
      </div>
    </>
  );
}
