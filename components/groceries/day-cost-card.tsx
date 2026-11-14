import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MIN_PRICE_COVERAGE, type DayCost } from "@/lib/engine";
import { formatEuros, MEAL_DAYS } from "@/lib/groceries";

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** Ce que coûte ce qu'on mange, d'après le journal et les prix connus. Jamais extrapolé. */
export function DayCostCard({ cost, days, pricesHref }: { cost: DayCost; days: number; pricesHref: string }) {
  return (
    <Card aria-labelledby="cout-titre" className="grid gap-2">
      <h2 id="cout-titre" className="label-caps">
        Ce que tu manges
      </h2>
      {cost.perDay !== null ? (
        <>
          <p>
            <span className="font-numeric text-[32px] leading-none">{formatEuros(cost.perDay)}</span>
            <span className="text-[15px] text-muted"> par jour</span>
          </p>
          <p className="text-[14px] text-muted">
            Moyenne sur {days > 1 ? `${days} jours notés` : "le jour noté"}, d&apos;après tes prix au kilo. Ils couvrent {percent.format(cost.coverage)} de tes calories
            {cost.coverage < 0.995 ? " : le reste n'est pas compté." : "."}
          </p>
        </>
      ) : (
        <p className="text-[15px] text-muted">
          {days === 0
            ? `Rien de noté dans ton journal ces ${MEAL_DAYS} derniers jours : pas de coût à estimer.`
            : `Tes prix couvrent ${percent.format(cost.coverage)} de tes calories. À partir de ${percent.format(MIN_PRICE_COVERAGE)}, Fonte estime ce que tu dépenses par jour pour manger.`}
        </p>
      )}
      <Link href={pricesHref} className="justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline">
        Saisir mes prix au kilo
      </Link>
    </Card>
  );
}
