import { BarbellIcon, BatteryMediumIcon, CaretRightIcon, ForkKnifeIcon, ScalesIcon, SneakerMoveIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { getProfile } from "@/lib/auth";
import { localTime } from "@/lib/dates";
import { kgTo, mealForTime } from "@/lib/engine";
import { MEAL_TO } from "@/lib/nutrition";
import { getActiveWorkout } from "../entrainement/data";
import { getWeightSummary } from "../weight-data";

export const metadata: Metadata = { title: "Ajouter" };

export default async function QuickAddPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const [weight, active] = await Promise.all([getWeightSummary(profile.user_id, profile.timezone, null, 14), getActiveWorkout()]);
  const { hour, minute } = localTime(profile.timezone);
  const meal = mealForTime(hour, minute);

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
        <nav aria-label="Raccourcis" className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
          <Shortcut href="/nutrition/ajouter" icon={<ForkKnifeIcon size={22} />} label="Repas" detail={`Ajouter ${MEAL_TO[meal]} : favoris, fréquents, recherche`} />
          <Shortcut
            href={active ? `/entrainement/seance/${active.id}` : "/entrainement"}
            icon={<BarbellIcon size={22} />}
            label="Séance"
            detail={active ? `Reprendre : ${active.name}` : "Démarrer depuis un modèle ou en libre"}
          />
          <Shortcut href="/entrainement/sports/ajouter" icon={<SneakerMoveIcon size={22} />} label="Sport" detail="Padel, foot, tennis… avec sa dépense estimée" />
          <Shortcut href="/progres/forme" icon={<BatteryMediumIcon size={22} />} label="Forme du jour" detail="Sommeil, courbatures, énergie, stress : 10 secondes" />
        </nav>
      </div>
    </>
  );
}

function Shortcut({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{label}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
