import { ArrowCounterClockwiseIcon, PlusIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { copyMeal } from "@/app/(app)/nutrition/actions";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { sumNutrients, type Meal } from "@/lib/engine";
import { addParams, formatGrams, formatKcal, formatMacro, MEAL_LABELS, MEAL_TO, type JournalEntry } from "@/lib/nutrition";

/**
 * Un repas du jour : ses aliments (un tap pour corriger), l'ajout, « Comme hier »
 * quand il est vide et que la veille ne l'était pas, et l'enregistrement en favori.
 */
export function MealSection({
  meal,
  entries,
  day,
  today,
  previous,
}: {
  meal: Meal;
  entries: JournalEntry[];
  day: string;
  today: string;
  /** Le même repas la veille, pour « Comme hier ». */
  previous: { day: string; entries: JournalEntry[] };
}) {
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  const params = addParams(meal, day, today);
  const previousTotals = sumNutrients(previous.entries.map((e) => e.nutrients));
  const titleId = `${meal}-titre`;

  return (
    <section id={meal} aria-labelledby={titleId} className="scroll-mt-4 overflow-hidden rounded-control border border-line bg-surface shadow-card">
      <header className="flex items-baseline gap-3 px-4 pt-3.5 pb-2.5">
        <h2 id={titleId} className="flex-1 text-[17px] font-semibold">
          {MEAL_LABELS[meal]}
        </h2>
        {entries.length ? (
          <p className="text-[13px] text-muted">
            <span className="font-numeric text-[17px] text-text">{formatKcal(totals.kcal)}</span> kcal · {formatMacro(totals.proteinG)} g prot.
          </p>
        ) : null}
      </header>

      {entries.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {entries.map((e) => (
            <li key={e.id}>
              <Link href={`/nutrition/journal/${e.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{e.food.name}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {formatGrams(e.grams)} · {formatMacro(e.nutrients.proteinG)} g prot.
                  </span>
                </span>
                <span className="shrink-0 text-[14px] text-muted">
                  <span className="font-numeric text-[17px] text-text">{formatKcal(e.nutrients.kcal)}</span> kcal
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-2 p-3">
        <div className="flex gap-2">
          <Link
            href={`/nutrition/ajouter?${params}`}
            aria-label={`Ajouter ${MEAL_TO[meal]}`}
            className={buttonClasses("secondary", "md", "flex-1")}
          >
            <PlusIcon size={18} weight="bold" aria-hidden="true" /> Ajouter
          </Link>
          {entries.length === 0 && previous.entries.length > 0 ? (
            <form action={copyMeal} className="flex-1">
              <input type="hidden" name="day" value={day} />
              <input type="hidden" name="meal" value={meal} />
              <input type="hidden" name="from" value={previous.day} />
              <SubmitButton variant="secondary" className="w-full px-3 whitespace-nowrap" pendingLabel="Ajout…">
                <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden="true" /> {day === today ? "Comme hier" : "Comme la veille"}
              </SubmitButton>
            </form>
          ) : null}
          {entries.length > 0 ? (
            <Link
              href={`/nutrition/favoris/nouveau?${params}`}
              aria-label={`Enregistrer en favori : ${MEAL_LABELS[meal]}`}
              className={buttonClasses("ghost", "md", "shrink-0 px-3")}
            >
              <StarIcon size={18} aria-hidden="true" /> Favori
            </Link>
          ) : null}
        </div>
        {entries.length === 0 && previous.entries.length > 0 ? (
          <p className="px-1 text-[13px] text-muted">
            {day === today ? "Hier" : "La veille"} : {previous.entries.map((e) => e.food.name).join(", ")} ({formatKcal(previousTotals.kcal)} kcal)
          </p>
        ) : null}
      </div>
    </section>
  );
}
