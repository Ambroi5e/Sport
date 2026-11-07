import { PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { logSavedMeal, quickLog } from "@/app/(app)/nutrition/actions";
import { nutrientsFor, type Meal, type Nutrients } from "@/lib/engine";
import { formatGrams, formatKcal, formatMacro, MEAL_TO, type Food } from "@/lib/nutrition";
import { RowSubmit } from "./row-submit";

export type QuickFavorite = { id: string; name: string; itemCount: number; totals: Nutrients };
export type QuickFood = { food: Food; grams: number };

/**
 * Raccourcis de l'écran d'ajout : un tap ajoute un repas favori entier, ou un
 * aliment fréquent avec sa dernière quantité. Le réglage mène à la quantité.
 */
export function QuickPicks({
  favorites,
  frequent,
  meal,
  day,
  params,
}: {
  favorites: QuickFavorite[];
  frequent: QuickFood[];
  meal: Meal;
  day: string;
  params: string;
}) {
  if (favorites.length === 0 && frequent.length === 0) {
    return (
      <p className="rounded-control border border-dashed border-line p-4 text-[15px] text-muted">
        Cherche un aliment pour commencer. Ceux que tu notes souvent et tes repas favoris s&apos;afficheront ici, ajoutables en un tap.
      </p>
    );
  }
  const hidden = (
    <>
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="day" value={day} />
    </>
  );

  return (
    <div className="grid gap-5">
      {favorites.length ? (
        <section aria-labelledby="favoris-titre" className="grid gap-2">
          <h2 id="favoris-titre" className="label-caps">
            Repas favoris
          </h2>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {favorites.map((f) => (
              <li key={f.id}>
                <form action={logSavedMeal}>
                  {hidden}
                  <input type="hidden" name="savedMealId" value={f.id} />
                  <RowSubmit label={`Ajouter ${f.name} ${MEAL_TO[meal]}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{f.name}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {f.itemCount} aliment{f.itemCount > 1 ? "s" : ""} · {formatKcal(f.totals.kcal)} kcal · {formatMacro(f.totals.proteinG)} g prot.
                      </span>
                    </span>
                    <PlusIcon size={20} weight="bold" className="shrink-0 text-accent-text" aria-hidden="true" />
                  </RowSubmit>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {frequent.length ? (
        <section aria-labelledby="frequents-titre" className="grid gap-2">
          <h2 id="frequents-titre" className="label-caps">
            Fréquents
          </h2>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {frequent.map(({ food, grams }) => {
              const kcal = nutrientsFor(food.per100, grams).kcal;
              return (
                <li key={food.id} className="flex items-stretch">
                  <form action={quickLog} className="min-w-0 flex-1">
                    {hidden}
                    <input type="hidden" name="foodId" value={food.id} />
                    <input type="hidden" name="grams" value={grams} />
                    <RowSubmit label={`Ajouter ${formatGrams(grams)} de ${food.name} ${MEAL_TO[meal]}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{food.name}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {formatGrams(grams)} · {formatKcal(kcal)} kcal
                        </span>
                      </span>
                      <PlusIcon size={20} weight="bold" className="shrink-0 text-accent-text" aria-hidden="true" />
                    </RowSubmit>
                  </form>
                  <Link
                    href={`/nutrition/ajouter/${food.id}?${params}`}
                    aria-label={`Choisir la quantité de ${food.name}`}
                    className="grid w-14 shrink-0 place-items-center border-l border-line text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    <SlidersHorizontalIcon size={20} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
