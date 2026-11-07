import { WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { PaceAlert } from "@/lib/engine";
import { kgTo } from "@/lib/engine";
import { formatDelta } from "@/lib/body";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Le rythme sort de la fourchette deux semaines de suite : on le dit en clair,
 * avec une suggestion de ±200 kcal que l'utilisateur applique lui-même.
 */
export function PaceAlertNotice({ alert, target, unit }: { alert: PaceAlert; target: { min: number; max: number }; unit: "kg" | "lb" }) {
  const [first, second] = alert.changes.map((c) => formatDelta(kgTo(unit, c), 2));
  const above = alert.direction === "au_dessus";
  return (
    <div role="note" aria-labelledby="rythme-titre" className="grid gap-2 rounded-control border border-warning/60 bg-warning/10 p-4">
      <p id="rythme-titre" className="flex items-center gap-2 text-[15px] font-semibold">
        <WarningIcon size={18} weight="fill" className="shrink-0 text-warning" aria-hidden="true" />
        Rythme {above ? "au-dessus" : "en dessous"} de ta fourchette depuis deux semaines
      </p>
      <p className="text-[14px] text-muted">
        Ta moyenne a varié de {first} puis {second} {unit} par semaine, pour {fmt(kgTo(unit, target.min))} à {fmt(kgTo(unit, target.max))} visés. Tu peux
        essayer {above ? "de retirer" : "d'ajouter"} environ {Math.abs(alert.kcal)} kcal par jour à ta cible, puis observer deux semaines.
      </p>
      <p className="text-[13px] text-muted">Conseil général : en cas de problème de santé, demande l&apos;avis d&apos;un professionnel.</p>
      <Link href="/nutrition/objectifs" className="justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline">
        Ajuster mes cibles
      </Link>
    </div>
  );
}
