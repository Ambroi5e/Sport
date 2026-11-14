import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Supplement } from "@/lib/supplements";

/** Carte d'accueil : seulement s'il reste des compléments à cocher aujourd'hui. */
export function TodaySupplementsCard({ supplements, href }: { supplements: Supplement[]; href: string }) {
  const left = supplements.filter((s) => !s.paused && !s.takenToday);
  if (!left.length) return null;
  return (
    <Card aria-labelledby="complements-titre" className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="complements-titre" className="text-lg font-semibold">
          Compléments
        </h2>
        <Link href={href} className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
          Cocher
        </Link>
      </div>
      <p className="text-[15px] text-muted">
        {left.length === 1 ? "Reste à prendre : " : `${left.length} à prendre : `}
        <span className="text-text">{left.map((s) => s.name).join(", ")}</span>.
      </p>
    </Card>
  );
}
