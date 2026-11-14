import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ReviewState } from "@/app/(app)/progres/bilan/actions";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { WeekReview, WeightUnit } from "@/lib/engine";
import { capitalize } from "@/lib/planning";
import { FEELING_LABELS, reviewLines, weekLabel, type ReviewTone, type SavedReview } from "@/lib/review";
import { ReviewForm } from "./review-form";

const TONE_WORD: Record<ReviewTone, string | null> = { bien: "Bien", attention: "À regarder", neutre: null };

/**
 * Le bilan d'une semaine : cinq rubriques, puis ce que la personne en dit. Le ton
 * de chaque rubrique est écrit en toutes lettres ; la couleur ne fait que le doubler.
 */
export function ReviewView({
  review,
  unit,
  saved,
  history,
  current,
  prevHref,
  nextHref,
  weekHref,
  lineHref,
  notice,
  saveAction,
}: {
  review: WeekReview;
  unit: WeightUnit;
  saved: SavedReview | null;
  history: SavedReview[];
  /** La semaine affichée est encore en cours : ses chiffres vont bouger. */
  current: boolean;
  prevHref: string;
  nextHref: string | null;
  weekHref: (weekStart: string) => string;
  /** Lien de chaque rubrique ; par défaut celui de l'écran concerné. */
  lineHref?: (href: string) => string;
  /** Alerte de rythme, quand il y en a une. */
  notice?: ReactNode;
  saveAction: (state: ReviewState, formData: FormData) => Promise<ReviewState>;
}) {
  const round = "grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2";
  const others = history.filter((h) => h.weekStart !== review.weekStart);
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
      <div className="grid gap-4">
        <nav aria-label="Semaine affichée" className="flex items-center gap-2">
          <Link href={prevHref} aria-label="Semaine précédente" className={round}>
            <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1 text-center leading-tight">
            <p className="truncate text-[17px] font-semibold">{capitalize(`semaine ${weekLabel(review.weekStart)}`)}</p>
            <p className="text-[13px] text-muted">{current ? "En cours : les chiffres vont encore bouger" : "Du lundi au dimanche"}</p>
          </div>
          {nextHref ? (
            <Link href={nextHref} aria-label="Semaine suivante" className={round}>
              <CaretRightIcon size={20} weight="bold" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11 shrink-0" aria-hidden="true" />
          )}
        </nav>

        <ul className="grid gap-3">
          {reviewLines(review, unit).map((line) => (
            <li key={line.key}>
              <Link
                href={lineHref ? lineHref(line.href) : line.href}
                className="grid gap-1.5 rounded-control border border-line bg-surface p-4 shadow-card transition-colors hover:bg-surface-2"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="label-caps">{line.title}</span>
                  {TONE_WORD[line.tone] ? (
                    <span className={cn("text-[13px] font-medium", line.tone === "bien" ? "text-success" : "text-warning")}>{TONE_WORD[line.tone]}</span>
                  ) : null}
                </span>
                <span>
                  <span className="font-numeric text-[28px] leading-none">{line.value}</span>
                  {line.unit ? <span className="text-[15px] text-muted"> {line.unit}</span> : null}
                </span>
                <span className="text-[14px] text-muted">{line.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
        {notice}
      </div>

      <div className="grid gap-4">
        <Card className="grid gap-4">
          <h2 className="text-lg font-semibold">Ton ressenti</h2>
          <ReviewForm key={review.weekStart} saved={saved} action={saveAction} />
        </Card>
        {others.length ? (
          <section aria-labelledby="bilans-titre" className="grid gap-2">
            <h2 id="bilans-titre" className="label-caps">
              Bilans précédents
            </h2>
            <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
              {others.map((h) => (
                <li key={h.weekStart}>
                  <Link href={weekHref(h.weekStart)} className="grid gap-0.5 px-4 py-3 hover:bg-surface-2">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-medium">{capitalize(weekLabel(h.weekStart))}</span>
                      <span className="shrink-0 text-[13px] text-muted">
                        {h.feeling} sur 5 · {FEELING_LABELS[h.feeling]}
                      </span>
                    </span>
                    {h.note ? <span className="line-clamp-2 text-[13px] text-muted">{h.note}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Carte d'accueil : le dimanche et le lundi, tant que le bilan n'est pas fait. */
export function ReviewPrompt({ weekStart, href }: { weekStart: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-control border border-accent/60 bg-accent/10 p-4 transition-colors hover:bg-accent/15">
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">Ton bilan de la semaine est prêt</span>
        <span className="block text-[14px] text-muted">Semaine {weekLabel(weekStart)} : cinq minutes pour faire le point.</span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
