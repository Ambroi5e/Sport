import { CookingPotIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { nutrientsFor } from "@/lib/engine";
import { formatKcal, formatMacro, type Food } from "@/lib/nutrition";

/** Recettes : un tap pour la modifier, « Noter » pour ajouter une part au journal. */
export function RecipeList({ recipes, basePath = "/nutrition" }: { recipes: { food: Food; portions: number }[]; basePath?: string }) {
  if (!recipes.length) {
    return (
      <EmptyState icon={<CookingPotIcon size={22} />} title="Aucune recette pour l'instant">
        Ton poulet curry du dimanche, ton chili en cinq parts : note les ingrédients une fois, puis chaque part en un tap.
      </EmptyState>
    );
  }
  return (
    <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
      {recipes.map(({ food, portions }) => {
        const part = food.portionG ? nutrientsFor(food.per100, food.portionG) : null;
        return (
          <li key={food.id} className="flex items-center gap-1 pr-2">
            <Link href={`${basePath}/recettes/${food.id}`} className="min-w-0 flex-1 px-4 py-3 hover:bg-surface-2">
              <span className="block text-[15px] leading-snug font-medium">{food.name}</span>
              <span className="block text-[13px] text-muted">
                {part && food.portionG
                  ? `${portions} part${portions > 1 ? "s" : ""} de ${formatKcal(food.portionG)} g · ${formatKcal(part.kcal)} kcal, ${formatMacro(part.proteinG)} g prot. la part`
                  : `${formatKcal(food.per100.kcal)} kcal pour 100 g`}
              </span>
            </Link>
            <Link
              href={`${basePath}/ajouter/${food.id}`}
              aria-label={`Noter une part de ${food.name}`}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 text-[14px] font-semibold hover:bg-line/60"
            >
              <PlusIcon size={16} weight="bold" aria-hidden="true" /> Noter
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
