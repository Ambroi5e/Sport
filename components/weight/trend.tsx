import type { RateStatus } from "@/lib/engine";
import { kgTo } from "@/lib/engine";
import { cn } from "@/components/ui/cn";

const STATUS_TEXT: Record<RateStatus, string> = {
  dans_la_cible: "dans la cible",
  trop_lent: "sous la cible",
  trop_rapide: "au-dessus de la cible",
  inconnu: "",
};

function fmt(n: number, digits = 1) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Moyenne 7 jours et rythme hebdomadaire, avec le statut écrit en toutes lettres. */
export function WeightTrend({
  average7,
  rate,
  status,
  target,
  unit,
}: {
  average7: number | null;
  rate: number | null;
  status: RateStatus | null;
  target: { min: number; max: number } | null;
  unit: "kg" | "lb";
}) {
  const statusColor =
    status === "dans_la_cible" ? "text-success" : status === "trop_lent" || status === "trop_rapide" ? "text-warning" : "text-muted";

  return (
    <dl className="grid grid-cols-2 gap-3">
      <div className="rounded-control bg-surface-2 p-3">
        <dt className="text-[12px] text-muted">Moyenne 7 jours</dt>
        <dd className="font-numeric mt-1 text-[28px]">
          {average7 === null ? "--" : fmt(kgTo(unit, average7))}
          <span className="ml-1 font-sans text-sm font-semibold text-muted">{unit}</span>
        </dd>
      </div>
      <div className="rounded-control bg-surface-2 p-3">
        <dt className="text-[12px] text-muted">Rythme par semaine</dt>
        <dd className="font-numeric mt-1 text-[28px]">
          {rate === null ? "--" : `${rate > 0 ? "+" : ""}${fmt(kgTo(unit, rate), 2)}`}
          <span className="ml-1 font-sans text-sm font-semibold text-muted">{unit}</span>
        </dd>
        {rate === null ? (
          <p className="mt-1 text-[12px] text-muted">Il faut 4 pesées sur au moins 7 jours.</p>
        ) : status && target ? (
          <p className={cn("mt-1 text-[12px] font-medium", statusColor)}>
            {STATUS_TEXT[status]} ({fmt(target.min, 2)} à {fmt(target.max, 2)})
          </p>
        ) : null}
      </div>
    </dl>
  );
}
