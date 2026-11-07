"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/(app)/nutrition/actions";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { MEALS, nutrientsFor, type Meal } from "@/lib/engine";
import { formatGrams, formatKcal, formatMacro, MEAL_LABELS, portionChip, type Food } from "@/lib/nutrition";

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function parse(value: string): number | null {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 5000 ? n : null;
}

/**
 * Quantité d'un aliment : grand champ préremplie, raccourcis de portion,
 * apports recalculés en direct. Avec `mealChoice`, le repas se change ici.
 */
export function GramsForm({
  food,
  defaultGrams,
  lastGrams,
  action,
  hidden,
  submitLabel,
  mealChoice,
}: {
  food: Food;
  defaultGrams: number;
  lastGrams: number | null;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  submitLabel: string;
  mealChoice?: Meal;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const [value, setValue] = useState(numberFormat.format(defaultGrams));
  const grams = parse(value);
  const n = grams === null ? null : nutrientsFor(food.per100, grams);

  const chips: { label: string; grams: number }[] = [];
  const add = (label: string, g: number) => {
    if (!chips.some((c) => c.grams === g)) chips.push({ label, grams: g });
  };
  if (food.portionG && food.portionLabel) {
    add(portionChip(food.portionLabel, food.portionG), food.portionG);
    add(`× 2 · ${formatGrams(food.portionG * 2)}`, food.portionG * 2);
  }
  if (lastGrams) add(`Dernière fois · ${formatGrams(lastGrams)}`, lastGrams);
  add("100 g", 100);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {Object.entries(hidden).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}

      <div className="grid gap-2">
        <label htmlFor="grams" className="text-sm font-medium">
          Quantité
        </label>
        <div className="relative">
          <input
            id="grams"
            name="grams"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-invalid={grams === null || undefined}
            aria-describedby="grams-apports"
            className={cn(
              "font-numeric h-16 w-full rounded-control border bg-surface-2 pr-14 pl-4 text-[32px] text-text focus:border-accent focus:outline-none",
              grams === null ? "border-danger" : "border-line",
            )}
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-muted">g</span>
        </div>
        <div role="group" aria-label="Raccourcis de quantité" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.grams}
              type="button"
              aria-pressed={grams === c.grams}
              onClick={() => setValue(numberFormat.format(c.grams))}
              className={cn(
                "h-10 rounded-full border px-3.5 text-sm font-medium transition-colors duration-[120ms]",
                grams === c.grams ? "border-accent bg-accent/15 text-text" : "border-line bg-surface text-muted hover:text-text",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <dl id="grams-apports" aria-live="polite" className="grid grid-cols-4 gap-2 rounded-control border border-line bg-surface p-3 text-center">
        {(
          [
            ["kcal", n ? formatKcal(n.kcal) : "–"],
            ["prot.", n ? `${formatMacro(n.proteinG)} g` : "–"],
            ["gluc.", n ? `${formatMacro(n.carbsG)} g` : "–"],
            ["lip.", n ? `${formatMacro(n.fatG)} g` : "–"],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="order-2 text-[12px] text-muted">{label}</dt>
            <dd className="font-numeric order-1 text-[20px] leading-tight">{v}</dd>
          </div>
        ))}
      </dl>

      {mealChoice ? (
        <ChoiceGroup name="meal" legend="Repas" columns={4} defaultValue={mealChoice} options={MEALS.map((m) => ({ value: m, label: MEAL_LABELS[m] }))} />
      ) : null}

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full" disabled={grams === null} pendingLabel="Enregistrement…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
