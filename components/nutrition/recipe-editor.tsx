"use client";

import { MagnifyingGlassIcon, MinusIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { flushSync } from "react-dom";
import type { FormState } from "@/app/(app)/nutrition/actions";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { nutrientsFor } from "@/lib/engine";
import { formatGrams, formatKcal, formatMacro, matchFoods, type Food } from "@/lib/nutrition";
import { MAX_PORTIONS, MAX_RECIPE_ITEMS, recipeRow } from "@/lib/recipes";

const NBSP = "\u00a0";
const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, useGrouping: false });

/** Nombre saisi au clavier français, strictement positif ; sinon null. */
function parse(value: string, max: number): number | null {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

type Item = { food: Food; grams: string };

/**
 * Une recette sur un seul écran : ingrédients ajoutés depuis une recherche,
 * grammes modifiables, parts et poids cuit, totaux recalculés à chaque frappe.
 * Le serveur refait le calcul depuis la base : ce qui est affiché n'est qu'un aperçu.
 */
export function RecipeEditor({
  action,
  ingredients,
  initial,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Aliments utilisables comme ingrédient (pas de recette). */
  ingredients: Food[];
  initial?: { name: string; portions: number; cookedG: number | null; items: { food: Food; grams: number }[] };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<Item[]>(() => (initial?.items ?? []).map((i) => ({ food: i.food, grams: numberFormat.format(i.grams) })));
  const [portions, setPortions] = useState(String(initial?.portions ?? 4));
  const [cooked, setCooked] = useState(initial?.cookedG ? numberFormat.format(initial.cookedG) : "");
  const [query, setQuery] = useState("");

  const parts = parse(portions, MAX_PORTIONS);
  const cookedG = cooked.trim() === "" ? null : parse(cooked, 50000);
  const valid = items.map((i) => parse(i.grams, 10000));
  const ready = items.length > 0 && valid.every((g) => g !== null) && parts !== null && Number.isInteger(parts) && (cooked.trim() === "" || cookedG !== null);
  const preview = recipeRow(
    items.flatMap((i, n) => (valid[n] === null ? [] : [{ grams: valid[n]!, per100: i.food.per100 }])),
    cookedG,
    parts ?? 1,
  );
  const v = preview.values;
  const inRecipe = new Set(items.map((i) => i.food.id));
  const matches = matchFoods(ingredients, query, 6);

  /** Ajoute l'ingrédient et place le curseur sur ses grammes, pour peser aussitôt. */
  function add(food: Food) {
    flushSync(() => {
      if (!inRecipe.has(food.id) && items.length < MAX_RECIPE_ITEMS) {
        setItems((list) => [...list, { food, grams: numberFormat.format(food.portionG ?? 100) }]);
      }
      setQuery("");
    });
    const input = document.getElementById(`grams-${food.id}`) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  const setGrams = (id: string, grams: string) => setItems((list) => list.map((i) => (i.food.id === id ? { ...i, grams } : i)));
  const nudge = (delta: number) => setPortions(String(Math.min(MAX_PORTIONS, Math.max(1, Math.round(parts ?? 1) + delta))));

  return (
    <form action={formAction} className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-8" noValidate>
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ foodId: i.food.id, grams: i.grams })))} />

      <div className="grid content-start gap-6">
        <Field id="name" name="name" label="Nom" autoComplete="off" maxLength={80} required placeholder="Par exemple : chili du dimanche" value={name} onChange={(e) => setName(e.target.value)} />

        <section aria-labelledby="ingredients-titre" className="grid gap-3">
          <div className="grid gap-1">
            <h2 id="ingredients-titre" className="text-base font-semibold">
              Ingrédients
            </h2>
            <p className="text-[13px] text-muted">Pèse-les tels que tu les mets dans la marmite, et choisis l&apos;aliment qui correspond (riz cru, poulet cru).</p>
          </div>

          {items.length ? (
            <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
              {items.map((item, n) => {
                const grams = valid[n];
                const kcal = grams === null ? null : nutrientsFor(item.food.per100, grams).kcal;
                return (
                  <li key={item.food.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2 pr-1.5 pl-4">
                    <div className="min-w-0">
                      <p className="text-[15px] leading-snug font-medium">{item.food.name}</p>
                      <p className="text-[13px] text-muted">{kcal === null ? "Poids à corriger" : `${formatKcal(kcal)} kcal`}</p>
                    </div>
                    <label className="relative block w-[6.5rem]">
                      <span className="sr-only">Grammes de {item.food.name}</span>
                      <input
                        id={`grams-${item.food.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="done"
                        value={item.grams}
                        onChange={(e) => setGrams(item.food.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                        aria-invalid={grams === null || undefined}
                        className={cn(
                          "font-numeric h-11 w-full rounded-control border bg-surface-2 pr-7 pl-2 text-right text-[18px] text-text focus:border-accent focus:outline-none",
                          grams === null ? "border-danger" : "border-line",
                        )}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted">g</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setItems((list) => list.filter((i) => i.food.id !== item.food.id))}
                      aria-label={`Retirer ${item.food.name}`}
                      className="grid size-11 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                    >
                      <XIcon size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="grid gap-2">
            <label className="relative block">
              <span className="sr-only">Ajouter un ingrédient</span>
              <MagnifyingGlassIcon size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (matches[0]) add(matches[0]);
                }}
                placeholder={items.length ? "Ajouter un ingrédient" : "Ajouter : riz, poulet…"}
                enterKeyHint="search"
                autoComplete="off"
                className="h-12 w-full rounded-control border border-line bg-surface-2 pr-3 pl-10 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </label>
            {query.trim() ? (
              matches.length ? (
                <ul aria-label="Ingrédients trouvés" className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
                  {matches.map((f) => (
                    <li key={f.id}>
                      <button type="button" onClick={() => add(f)} className="flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{f.name}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {f.brand ? `${f.brand} · ` : ""}
                            {formatKcal(f.per100.kcal)} kcal · {formatMacro(f.per100.proteinG)} g prot. pour 100 g
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-medium text-accent-text">{inRecipe.has(f.id) ? "Déjà là" : "Ajouter"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted" role="status">
                  Aucun aliment ne correspond. Crée-le d&apos;abord dans Mes aliments, puis reviens ici.
                </p>
              )
            ) : null}
          </div>
        </section>

        <section aria-labelledby="parts-titre" className="grid gap-4">
          <h2 id="parts-titre" className="text-base font-semibold">
            Parts et cuisson
          </h2>
          <div className="grid gap-1.5">
            <label htmlFor="portions" className="text-sm font-medium">
              Nombre de parts
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => nudge(-1)} disabled={(parts ?? 1) <= 1} aria-label="Une part de moins" className={stepClass}>
                <MinusIcon size={18} weight="bold" aria-hidden="true" />
              </button>
              <input
                id="portions"
                name="portions"
                inputMode="numeric"
                autoComplete="off"
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
                onFocus={(e) => e.target.select()}
                aria-invalid={parts === null || !Number.isInteger(parts) || undefined}
                className="font-numeric h-12 w-16 rounded-control border border-line bg-surface-2 text-center text-[22px] text-text focus:border-accent focus:outline-none"
              />
              <button type="button" onClick={() => nudge(1)} disabled={(parts ?? 1) >= MAX_PORTIONS} aria-label="Une part de plus" className={stepClass}>
                <PlusIcon size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
          <Field
            id="cookedG"
            name="cookedG"
            label="Poids une fois cuit (facultatif)"
            suffix="g"
            inputMode="decimal"
            autoComplete="off"
            value={cooked}
            onChange={(e) => setCooked(e.target.value)}
            error={cooked.trim() !== "" && cookedG === null ? "Un poids en grammes, 50 kg au plus." : null}
            hint={
              <>
                Marmite pleine moins marmite vide, utile si tu pèses ton assiette. Sans pesée, Fonte prend la somme des ingrédients crus
                {v.rawG > 0 ? ` (${formatGrams(v.rawG)})` : ""}.
              </>
            }
          />
        </section>
      </div>

      <div className="grid content-start gap-4 md:sticky md:top-6">
        <section aria-labelledby="totaux-titre" className="grid gap-3 rounded-control border border-line bg-surface p-4 shadow-card md:p-5">
          <h2 id="totaux-titre" className="label-caps">
            Une part{v.portionG > 0 ? ` · ${formatKcal(v.portionG)} g` : ""}
          </h2>
          {v.rawG > 0 ? (
            <>
              <p>
                <span className="font-numeric text-[40px] leading-none">{formatKcal(v.perPortion.kcal)}</span> <span className="text-[15px] text-muted">kcal</span>
              </p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["protéines", v.perPortion.proteinG],
                    ["glucides", v.perPortion.carbsG],
                    ["lipides", v.perPortion.fatG],
                  ] as const
                ).map(([label, grams]) => (
                  <div key={label} className="grid gap-0.5 rounded-control bg-surface-2 px-2 py-2">
                    <dt className="order-2 text-[12px] text-muted">{label}</dt>
                    <dd className="font-numeric order-1 text-[20px] leading-tight">{formatMacro(grams)} g</dd>
                  </div>
                ))}
              </dl>
              <p className="grid gap-0.5 text-[13px] text-muted">
                <span>
                  Pour 100{NBSP}g{NBSP}: {formatKcal(v.per100.kcal)} kcal, {formatMacro(v.per100.proteinG)} g de protéines
                </span>
                <span>
                  Plat entier{NBSP}: {formatKcal(v.total.kcal)} kcal pour {formatGrams(v.totalG)}
                </span>
              </p>
            </>
          ) : (
            <p className="text-[15px] text-muted">Les valeurs d&apos;une part s&apos;affichent dès le premier ingrédient.</p>
          )}
          {!preview.ok && items.length && ready ? (
            <p className="text-[14px] text-danger" role="status">
              {preview.error}
            </p>
          ) : null}
        </section>

        {state.error ? (
          <p role="alert" className="text-[14px] text-danger">
            {state.error}
          </p>
        ) : null}
        <SubmitButton size="lg" className="w-full" disabled={!ready || !preview.ok || name.trim().length < 2} pendingLabel="Enregistrement…">
          {submitLabel}
        </SubmitButton>
        {!items.length ? null : !ready ? (
          <p className="text-[13px] text-muted">Corrige les champs en rouge pour enregistrer.</p>
        ) : name.trim().length < 2 ? (
          <p className="text-[13px] text-muted">Donne un nom à la recette pour l&apos;enregistrer.</p>
        ) : null}
      </div>
    </form>
  );
}

const stepClass =
  "grid size-12 shrink-0 place-items-center rounded-control border border-line bg-surface-2 transition-transform active:scale-95 disabled:opacity-40";
