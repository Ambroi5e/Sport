"use client";

import { useActionState, useState } from "react";
import type { GroceryState } from "@/app/(app)/courses/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { costOf } from "@/lib/engine";
import { formatEuros, formatQuantity, type MealNeed } from "@/lib/groceries";

/**
 * « Depuis mes repas » : ce qui a été mangé, arrondi à une quantité d'achat.
 * Tout est coché sauf ce qui attend déjà dans la liste ; rien n'est ajouté sans validation.
 */
export function MealNeedsForm({ needs, action }: { needs: MealNeed[]; action: (state: GroceryState, formData: FormData) => Promise<GroceryState> }) {
  const [state, formAction] = useActionState(action, {});
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(needs.filter((n) => !n.inList).map((n) => n.foodId)));
  const total = needs.reduce((sum, n) => (chosen.has(n.foodId) && n.pricePerKg !== null ? sum + costOf(n.buyGrams, n.pricePerKg) : sum), 0);

  return (
    <form action={formAction} className="grid gap-4">
      <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
        {needs.map((n) => (
          <li key={n.foodId}>
            <label className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
              <input
                type="checkbox"
                name="food"
                value={n.foodId}
                checked={chosen.has(n.foodId)}
                onChange={(e) =>
                  setChosen((all) => {
                    const next = new Set(all);
                    if (e.target.checked) next.add(n.foodId);
                    else next.delete(n.foodId);
                    return next;
                  })
                }
                className="size-5 shrink-0 accent-(--color-accent)"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{n.name}</span>
                <span className="block text-[13px] text-muted">
                  {formatQuantity(Math.round(n.grams))} mangés{n.inList ? " · déjà dans la liste" : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-numeric block text-[16px]">{formatQuantity(n.buyGrams)}</span>
                {n.pricePerKg !== null ? <span className="block text-[13px] text-muted">{formatEuros(costOf(n.buyGrams, n.pricePerKg))}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full" disabled={!chosen.size} pendingLabel="Ajout…">
        {chosen.size ? `Ajouter ${chosen.size} article${chosen.size > 1 ? "s" : ""}${total > 0 ? ` · environ ${formatEuros(total)}` : ""}` : "Coche au moins un aliment"}
      </SubmitButton>
    </form>
  );
}
