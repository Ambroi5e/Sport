import { BarbellIcon, ForkKnifeIcon, ScalesIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { getProfile } from "@/lib/auth";
import { kgTo } from "@/lib/engine";
import { getWeightSummary } from "../weight-data";

export const metadata: Metadata = { title: "Ajouter" };

export default async function QuickAddPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const weight = await getWeightSummary(profile.user_id, profile.timezone, null, 14);

  return (
    <>
      <PageHeader title="Ajouter" back="/" />
      <div className="grid gap-4 md:max-w-xl">
        <Card className="grid gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ScalesIcon size={22} className="text-accent-text" aria-hidden="true" /> Pesée
          </h2>
          <QuickWeigh
            initial={weight.latest ? Math.round(kgTo(unit, weight.latest.kg) * 10) / 10 : null}
            unit={unit}
            loggedToday={weight.loggedToday}
          />
        </Card>
        <ul className="grid gap-2" aria-label="Bientôt disponible">
          {[
            { icon: BarbellIcon, label: "Séance de musculation" },
            { icon: ForkKnifeIcon, label: "Repas" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-control border border-dashed border-line px-4 py-3 text-muted">
              <Icon size={22} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <span className="text-[12px]">bientôt</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
