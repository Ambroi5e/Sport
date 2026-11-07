"use client";

import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useDeferredValue, useState, type ReactNode } from "react";
import { formatKcal, formatMacro, type Food } from "@/lib/nutrition";
import { searchKey } from "@/lib/text";

const MAX_RESULTS = 40;

/**
 * Recherche d'aliment sans accents. Champ vide : les raccourcis (favoris,
 * fréquents) passés en `children`. Un résultat mène à l'écran de quantité.
 */
export function FoodPicker({ foods, params, children }: { foods: Food[]; params: string; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const q = searchKey(useDeferredValue(query).trim());

  const matches = q
    ? foods
        .map((f) => ({ f, key: searchKey(`${f.name} ${f.brand ?? ""}`) }))
        .filter(({ key }) => q.split(/\s+/).every((word) => key.includes(word)))
        // Les noms qui commencent par la recherche d'abord (« riz » avant « farine de riz »).
        .sort((a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q)))
        .slice(0, MAX_RESULTS)
        .map(({ f }) => f)
    : [];

  return (
    <div className="grid gap-5">
      <label className="relative block">
        <span className="sr-only">Rechercher un aliment</span>
        <MagnifyingGlassIcon size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher : avoine, poulet, skyr…"
          enterKeyHint="search"
          autoComplete="off"
          className="h-12 w-full rounded-control border border-line bg-surface-2 pr-3 pl-10 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      {q ? (
        <section aria-label="Résultats" className="grid gap-2">
          <p className="text-[13px] text-muted" aria-live="polite">
            {matches.length === 0 ? "Aucun aliment ne correspond." : `${matches.length}${matches.length === MAX_RESULTS ? "+" : ""} aliment${matches.length > 1 ? "s" : ""}`}
          </p>
          {matches.length ? (
            <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
              {matches.map((f) => (
                <li key={f.id}>
                  <Link href={`/nutrition/ajouter/${f.id}?${params}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {f.name}
                        {f.personal ? <span className="ml-2 text-[12px] font-normal text-muted">perso</span> : null}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {f.brand ? `${f.brand} · ` : ""}
                        {formatKcal(f.per100.kcal)} kcal · {formatMacro(f.per100.proteinG)} g prot. pour 100 g
                      </span>
                    </span>
                    <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        children
      )}

      <Link
        href={`/nutrition/aliments/nouveau?${params}${q ? `&nom=${encodeURIComponent(query.trim())}` : ""}`}
        className="flex min-h-12 items-center gap-2 rounded-control border border-dashed border-line px-4 text-[15px] font-medium text-accent-text hover:bg-surface-2"
      >
        <PlusIcon size={18} weight="bold" aria-hidden="true" /> Créer un aliment
        {q ? <span className="truncate font-normal text-muted">« {query.trim()} »</span> : null}
      </Link>
    </div>
  );
}
