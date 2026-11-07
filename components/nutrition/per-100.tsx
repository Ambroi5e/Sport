import { formatKcal, formatMacro, type Food } from "@/lib/nutrition";

/** Valeurs pour 100 g, et leur origine : étiquette pour un aliment perso, moyenne pour le catalogue. */
export function Per100({ food }: { food: Food }) {
  const p = food.per100;
  return (
    <p className="text-[14px] text-muted">
      {food.brand ? <span className="text-text">{food.brand} · </span> : null}
      Pour 100 g : {formatKcal(p.kcal)} kcal, {formatMacro(p.proteinG)} g de protéines, {formatMacro(p.carbsG)} g de glucides, {formatMacro(p.fatG)} g de lipides.
      {food.recipe ? " Calculé d'après les ingrédients de ta recette." : food.personal ? null : " Valeurs moyennes (Ciqual, USDA) : l'emballage fait foi."}
    </p>
  );
}
