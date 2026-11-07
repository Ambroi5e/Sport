import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { DayType, Nutrients } from "@/lib/engine";
import { DAY_TYPE_LABELS, formatKcal, formatMacro, type Target } from "@/lib/nutrition";

/** Carte d'accueil : calories et protéines du jour, face à la cible s'il y en a une. */
export function TodayNutritionCard({ totals, target, dayType }: { totals: Nutrients; target: Target | null; dayType: DayType }) {
  return (
    <Card aria-labelledby="nutrition-jour-titre" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="nutrition-jour-titre" className="text-lg font-semibold">
          Nutrition du jour
        </h2>
        <Link href="/nutrition" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
          Journal
        </Link>
      </div>
      <p className="text-[13px] text-muted">{DAY_TYPE_LABELS[dayType]}</p>
      <dl className="grid grid-cols-2 gap-3">
        <div className="grid gap-0.5">
          <dt className="text-[13px] text-muted">Calories</dt>
          <dd>
            <span className="font-numeric text-[26px]">{formatKcal(totals.kcal)}</span>
            <span className="text-[14px] text-muted">{target ? ` / ${formatKcal(target.kcal)}` : " kcal"}</span>
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-[13px] text-muted">Protéines</dt>
          <dd>
            <span className="font-numeric text-[26px]">{formatMacro(totals.proteinG)}</span>
            <span className="text-[14px] text-muted">{target ? ` / ${formatMacro(target.proteinG)} g` : " g"}</span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}
