import { ScalesIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WeightTrend } from "@/components/weight/trend";
import { getProfile } from "@/lib/auth";
import { formatShortDate } from "@/lib/dates";
import { kgTo } from "@/lib/engine";
import { getPrimaryGoal, getWeightSummary } from "../weight-data";

export const metadata: Metadata = { title: "Progrès" };

export default async function ProgressPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const goal = await getPrimaryGoal(profile.user_id);
  const weight = await getWeightSummary(profile.user_id, profile.timezone, goal?.type ?? null, 60);

  return (
    <>
      <PageHeader title="Progrès" />
      {weight.entries.length === 0 ? (
        <EmptyState icon={<ScalesIcon size={22} />} title="Aucune pesée pour l'instant">
          Pèse-toi depuis l&apos;accueil : la moyenne sur 7 jours et ton rythme hebdomadaire apparaîtront ici.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Card className="grid content-start gap-4">
            <h2 className="text-lg font-semibold">Tendance du poids</h2>
            <WeightTrend average7={weight.average7} rate={weight.rate} status={weight.status} target={weight.target} unit={unit} />
            {weight.status === "trop_lent" ? (
              <p className="text-[14px] text-muted">
                Si le rythme reste sous la cible deux semaines de suite, essaie d&apos;ajouter environ 200 kcal par jour.
              </p>
            ) : weight.status === "trop_rapide" ? (
              <p className="text-[14px] text-muted">
                Si le rythme reste au-dessus de la cible deux semaines de suite, essaie de retirer environ 200 kcal par jour.
              </p>
            ) : null}
          </Card>
          <Card className="grid content-start gap-2">
            <h2 className="text-lg font-semibold">Pesées</h2>
            <ul className="divide-y divide-line">
              {weight.entries.map((e) => (
                <li key={e.date} className="flex items-center justify-between py-2.5 text-[15px]">
                  <span className="text-muted">{formatShortDate(e.date)}</span>
                  <span className="font-numeric text-[20px]">
                    {kgTo(unit, e.kg).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span className="ml-1 font-sans text-[13px] font-semibold text-muted">{unit}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
