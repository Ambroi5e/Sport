"use client";

import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useDeferredValue, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/components/ui/cn";
import { searchKey } from "@/lib/text";
import { EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type ExerciseSummary } from "@/lib/training";

/**
 * Bibliothèque filtrable. Avec `addAction`, chaque ligne ajoute l'exercice
 * (sélecteur de séance ou de modèle) ; sinon elle mène à sa fiche.
 */
export function ExerciseList({
  exercises,
  addAction,
}: {
  exercises: ExerciseSummary[];
  addAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const muscles = group ? MUSCLE_GROUPS.find((g) => g.id === group)?.muscles ?? [] : null;
  const q = searchKey(deferredQuery.trim());
  const visible = exercises.filter(
    (e) =>
      (!q || searchKey(e.name).includes(q)) && (!muscles || e.primary_muscles.some((m) => muscles.includes(m))),
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <label className="relative block">
          <span className="sr-only">Rechercher un exercice</span>
          <MagnifyingGlassIcon size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            enterKeyHint="search"
            className="h-12 w-full rounded-control border border-line bg-surface-2 pr-3 pl-10 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Filtrer par muscle" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {[{ id: null, label: "Tous" }, ...MUSCLE_GROUPS].map((g) => {
            const active = group === g.id;
            return (
              <button
                key={g.label}
                type="button"
                aria-pressed={active}
                onClick={() => setGroup(g.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms]",
                  active ? "border-accent bg-accent/15 text-text" : "border-line bg-surface text-muted hover:text-text",
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[13px] text-muted" aria-live="polite">
        {visible.length} exercice{visible.length > 1 ? "s" : ""}
      </p>

      <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
        {visible.map((e) => {
          const content = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-text">
                  {e.name}
                  {e.user_id ? <span className="ml-2 text-[12px] font-normal text-muted">perso</span> : null}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {e.primary_muscles.map((m) => MUSCLE_LABELS[m]).join(", ")} · {EQUIPMENT_LABELS[e.equipment]}
                </span>
              </span>
              {addAction ? (
                <PlusIcon size={20} weight="bold" className="shrink-0 text-accent-text" aria-hidden="true" />
              ) : (
                <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
              )}
            </>
          );
          const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2";
          return (
            <li key={e.id}>
              {addAction ? (
                <form action={addAction}>
                  <input type="hidden" name="exerciseId" value={e.id} />
                  <AddButton className={rowClass} label={`Ajouter ${e.name}`}>
                    {content}
                  </AddButton>
                </form>
              ) : (
                <Link href={`/entrainement/exercices/${e.id}`} className={rowClass}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
        {visible.length === 0 ? <li className="px-4 py-6 text-[15px] text-muted">Aucun exercice ne correspond. Essaie un autre mot ou crée le tien.</li> : null}
      </ul>
    </div>
  );
}

/** Bouton d'ajout désactivé pendant l'envoi : un double tap n'ajoute pas deux fois. */
function AddButton({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn(className, pending && "opacity-60")} aria-label={label} disabled={pending}>
      {children}
    </button>
  );
}
