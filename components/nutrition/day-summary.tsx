import { BarbellIcon, CaretLeftIcon, CaretRightIcon, MoonIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { DayType, Nutrients } from "@/lib/engine";
import { DAY_TYPE_LABELS, formatKcal, formatMacro, type Target } from "@/lib/nutrition";

/** Navigation entre les jours : jamais au-delà d'aujourd'hui. */
export function DayNav({
  label,
  dayType,
  prevHref,
  nextHref,
  todayHref,
}: {
  label: string;
  dayType: DayType;
  prevHref: string;
  nextHref: string | null;
  todayHref: string | null;
}) {
  const round = "grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2";
  const Icon = dayType === "entrainement" ? BarbellIcon : MoonIcon;
  return (
    <nav aria-label="Jour affiché" className="flex items-center gap-2">
      <Link href={prevHref} aria-label="Jour précédent" className={round}>
        <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1 text-center leading-tight">
        <p className="truncate text-[17px] font-semibold">
          {label}
        </p>
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-muted">
          <Icon size={14} aria-hidden="true" /> {DAY_TYPE_LABELS[dayType]}
          {todayHref ? (
            <>
              {" · "}
              <Link href={todayHref} className="font-medium text-accent-text underline-offset-4 hover:underline">
                Aujourd&apos;hui
              </Link>
            </>
          ) : null}
        </p>
      </div>
      {nextHref ? (
        <Link href={nextHref} aria-label="Jour suivant" className={round}>
          <CaretRightIcon size={20} weight="bold" aria-hidden="true" />
        </Link>
      ) : (
        <span className="size-11 shrink-0" aria-hidden="true" />
      )}
    </nav>
  );
}

/**
 * Calories et protéines du jour face à la cible du type de jour. La couleur
 * double toujours un texte : « reste 750 kcal », « 250 kcal au-dessus ».
 */
export function DaySummary({ totals, target, targetsHref }: { totals: Nutrients; target: Target | null; targetsHref: string }) {
  const kcalLeft = target ? target.kcal - totals.kcal : null;
  const proteinLeft = target ? target.proteinG - totals.proteinG : null;
  const over = kcalLeft !== null && target !== null && -kcalLeft > target.kcal * 0.05;

  return (
    <Card aria-labelledby="bilan-titre" className="grid gap-4">
      <h2 id="bilan-titre" className="sr-only">
        Bilan du jour
      </h2>
      <div className="grid gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="font-numeric text-[40px] leading-none">{formatKcal(totals.kcal)}</span>
          <span className="text-[15px] text-muted">{target ? `/ ${formatKcal(target.kcal)} kcal` : "kcal"}</span>
        </p>
        {target && kcalLeft !== null ? (
          <>
            <Bar value={totals.kcal / target.kcal} tone={over ? "warning" : "accent"} />
            <p className={cn("text-[14px]", over ? "text-warning" : "text-muted")}>
              {kcalLeft >= 0 ? `Reste ${formatKcal(kcalLeft)} kcal` : `${formatKcal(-kcalLeft)} kcal au-dessus de la cible`}
            </p>
          </>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <span className="font-medium">Protéines</span>
          <span className="text-muted">
            <span className="font-numeric text-[18px] text-text">{formatMacro(totals.proteinG)}</span>
            {target ? ` / ${formatMacro(target.proteinG)} g` : " g"}
          </span>
        </div>
        {target && proteinLeft !== null ? (
          <>
            <Bar value={target.proteinG > 0 ? totals.proteinG / target.proteinG : 1} tone="accent" />
            <p className="text-[13px] text-muted">{proteinLeft > 0 ? `Reste ${formatMacro(proteinLeft)} g` : "Cible atteinte"}</p>
          </>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-[14px]">
        <Macro label="Glucides" value={totals.carbsG} target={target?.carbsG ?? null} />
        <Macro label="Lipides" value={totals.fatG} target={target?.fatG ?? null} />
      </dl>

      {target ? null : (
        <div className="grid gap-2 rounded-inner bg-surface-2 p-3">
          <p className="text-[14px] text-muted">Fixe une cible pour les jours d&apos;entraînement et de repos : tu verras ce qu&apos;il te reste à manger.</p>
          <Link href={targetsHref} className={buttonClasses("secondary", "md", "w-full")}>
            Définir mes cibles
          </Link>
        </div>
      )}
    </Card>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target: number | null }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted">{label}</dt>
      <dd>
        <span className="font-numeric text-[18px]">{formatMacro(value)}</span>
        <span className="text-muted">{target !== null ? ` / ${formatMacro(target)} g` : " g"}</span>
      </dd>
    </div>
  );
}

function Bar({ value, tone }: { value: number; tone: "accent" | "warning" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out-fonte", tone === "warning" ? "bg-warning" : "bg-accent")}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  );
}
