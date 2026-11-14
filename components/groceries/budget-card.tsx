import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import type { BudgetStatus } from "@/lib/engine";
import { formatEuros } from "@/lib/groceries";

/** Ce que dit le budget, en mots : la couleur ne porte jamais l'information seule. */
export function budgetSentence(status: BudgetStatus): string {
  if (status.remaining === null) return "Pas de budget fixé.";
  return status.remaining >= 0 ? `Reste ${formatEuros(status.remaining)} cette semaine.` : `Budget dépassé de ${formatEuros(-status.remaining)}.`;
}

/** Budget de la semaine : dépensé, reste, et la barre qui se remplit. */
export function BudgetSummary({ budget, status }: { budget: number | null; status: BudgetStatus }) {
  const over = status.remaining !== null && status.remaining < 0;
  return (
    <div className="grid gap-2">
      <p className="label-caps">Cette semaine</p>
      <p>
        <span className="font-numeric text-[32px] leading-none">{formatEuros(status.spent)}</span>
        {budget !== null ? <span className="text-[15px] text-muted"> sur {formatEuros(budget)}</span> : <span className="text-[15px] text-muted"> {status.spent < 2 ? "dépensé" : "dépensés"}</span>}
      </p>
      {status.ratio !== null ? (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div className={cn("h-full rounded-full", over ? "bg-danger" : "bg-accent")} style={{ width: `${Math.min(100, Math.round(status.ratio * 100))}%` }} />
        </div>
      ) : null}
      <p className={cn("text-[14px]", over ? "text-danger" : "text-muted")}>
        {budgetSentence(status)}
        {status.average !== null ? ` Moyenne des dernières semaines : ${formatEuros(status.average)}.` : ""}
      </p>
    </div>
  );
}

/** En haut de la liste : le budget en un coup d'œil, un tap pour le détail. */
export function BudgetCard({ budget, status, href }: { budget: number | null; status: BudgetStatus; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-control border border-line bg-surface p-4 shadow-card transition-colors hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <BudgetSummary budget={budget} status={status} />
      </div>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
      <span className="sr-only">Budget, achats et prix</span>
    </Link>
  );
}
