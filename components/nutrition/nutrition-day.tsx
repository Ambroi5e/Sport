import { CaretRightIcon, CookieIcon, CookingPotIcon, StarIcon, TargetIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { addDays } from "@/lib/dates";
import { MEALS, sumNutrients, type DayType } from "@/lib/engine";
import { dayHref, dayLabel, formatKcal, type JournalEntry, type Target } from "@/lib/nutrition";
import { DayNav, DaySummary } from "./day-summary";
import { MealSection } from "./meal-section";

/**
 * Écran du jour : navigation, bilan face à la cible, quatre repas, liens.
 * Sur ordinateur, le bilan reste à gauche et les repas défilent à droite.
 */
export function NutritionDay({
  day,
  today,
  dayType,
  entries,
  previous,
  targets,
}: {
  day: string;
  today: string;
  dayType: DayType;
  entries: JournalEntry[];
  /** Le jour d'avant, pour « Comme hier ». */
  previous: JournalEntry[];
  targets: Partial<Record<DayType, Target>>;
}) {
  const previousDay = addDays(day, -1);
  const yesterday = addDays(today, -1);
  const totals = sumNutrients(entries.map((e) => e.nutrients));

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-[auto_1fr] md:gap-6">
      <div className="grid content-start gap-4">
        <DayNav
          label={dayLabel(day, today, yesterday)}
          dayType={dayType}
          prevHref={dayHref(previousDay, today)}
          nextHref={day < today ? dayHref(addDays(day, 1), today) : null}
          todayHref={day < yesterday ? dayHref(today, today) : null}
        />
        <DaySummary totals={totals} target={targets[dayType] ?? null} targetsHref="/nutrition/objectifs" />
      </div>

      <div className="grid content-start gap-3 md:col-start-2 md:row-span-2 md:row-start-1">
        {MEALS.map((m) => (
          <MealSection
            key={m}
            meal={m}
            entries={entries.filter((e) => e.meal === m)}
            day={day}
            today={today}
            previous={{ day: previousDay, entries: previous.filter((e) => e.meal === m) }}
          />
        ))}
      </div>

      <nav aria-label="Nutrition" className="grid divide-y divide-line self-start overflow-hidden rounded-control border border-line bg-surface">
        <NavRow
          href="/nutrition/objectifs"
          icon={<TargetIcon size={20} />}
          label="Cibles"
          detail={
            targets.entrainement && targets.repos
              ? `${formatKcal(targets.entrainement.kcal)} kcal à l'entraînement, ${formatKcal(targets.repos.kcal)} au repos`
              : "Suggestion selon ton profil"
          }
        />
        <NavRow href="/nutrition/favoris" icon={<StarIcon size={20} />} label="Repas favoris" detail="Un tap pour tout un repas" />
        <NavRow href="/nutrition/recettes" icon={<CookingPotIcon size={20} />} label="Recettes" detail="Tes plats préparés, à la part" />
        <NavRow href="/nutrition/aliments" icon={<CookieIcon size={20} />} label="Mes aliments" detail="Ceux que tu as créés" />
      </nav>
    </div>
  );
}

function NavRow({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
