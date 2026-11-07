import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { MEALS, type Meal } from "@/lib/engine";
import { addParams, MEAL_LABELS } from "@/lib/nutrition";

/** Choix du repas sur l'écran d'ajout : celui de l'heure est déjà choisi, on corrige d'un tap. */
export function MealTabs({ meal, day, today, basePath = "/nutrition/ajouter" }: { meal: Meal; day: string; today: string; basePath?: string }) {
  return (
    <nav aria-label="Repas" className="grid grid-cols-4 gap-1 rounded-control border border-line bg-surface-2 p-1">
      {MEALS.map((m) => (
        <Link
          key={m}
          href={`${basePath}?${addParams(m, day, today)}`}
          replace
          aria-current={m === meal ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center rounded-inner px-1 text-center text-[13px] leading-tight font-medium transition-colors duration-[120ms] sm:text-[14px]",
            m === meal ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
          )}
        >
          {MEAL_LABELS[m]}
        </Link>
      ))}
    </nav>
  );
}
