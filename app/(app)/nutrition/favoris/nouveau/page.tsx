import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoriteForm } from "@/components/nutrition/favorite-form";
import { PageHeader } from "@/components/ui/page-header";
import { sumNutrients, type Meal } from "@/lib/engine";
import { dayHref, formatGrams, formatKcal, formatMacro, isMeal, MEAL_LABELS } from "@/lib/nutrition";
import { addContext } from "../../context";
import { getDayLogs } from "../../data";

export const metadata: Metadata = { title: "Nouveau favori" };

const DEFAULT_NAMES: Record<Meal, string> = {
  petit_dejeuner: "Mon petit-déj",
  dejeuner: "Mon déjeuner",
  collation: "Ma collation",
  diner: "Mon dîner",
};

/** Enregistre en favori un repas du journal, tel qu'il est noté ce jour-là. */
export default async function NewFavoritePage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string }> }) {
  const search = await searchParams;
  const { today, day, meal } = await addContext(search);
  if (!isMeal(search.repas)) redirect(dayHref(day, today));
  const entries = (await getDayLogs(day)).filter((e) => e.meal === meal);
  if (entries.length === 0) redirect(dayHref(day, today, meal));
  const totals = sumNutrients(entries.map((e) => e.nutrients));

  return (
    <>
      <PageHeader title="Nouveau favori" eyebrow={MEAL_LABELS[meal]} back={dayHref(day, today, meal)} />
      <div className="grid gap-5 md:max-w-xl">
        <section aria-label="Contenu du favori" className="grid gap-2 rounded-control border border-line bg-surface p-4">
          <ul className="grid gap-1 text-[14px]">
            {entries.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{e.food.name}</span>
                <span className="shrink-0 text-muted">{formatGrams(e.grams)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line pt-2 text-[14px] text-muted">
            <span className="font-numeric text-[18px] text-text">{formatKcal(totals.kcal)}</span> kcal · {formatMacro(totals.proteinG)} g de protéines
          </p>
        </section>
        <FavoriteForm meal={meal} day={day} defaultName={DEFAULT_NAMES[meal]} />
      </div>
    </>
  );
}
