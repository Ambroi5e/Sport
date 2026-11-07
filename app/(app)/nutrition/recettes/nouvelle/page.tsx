import type { Metadata } from "next";
import { RecipeEditor } from "@/components/nutrition/recipe-editor";
import { PageHeader } from "@/components/ui/page-header";
import { saveRecipe } from "../../actions";
import { getIngredients } from "../../data";

export const metadata: Metadata = { title: "Nouvelle recette" };

export default async function NewRecipePage() {
  const ingredients = await getIngredients();
  return (
    <>
      <PageHeader title="Nouvelle recette" back="/nutrition/recettes" />
      <div className="md:max-w-4xl">
        <RecipeEditor action={saveRecipe.bind(null, null)} ingredients={ingredients} submitLabel="Créer la recette" />
      </div>
    </>
  );
}
