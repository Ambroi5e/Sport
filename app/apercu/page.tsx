import { BarbellIcon, FlagIcon } from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { QuickWeigh } from "@/components/weight/quick-weigh";
import { WeightTrend } from "@/components/weight/trend";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { StylePicker } from "@/components/settings/style-picker";
import { getAppearance } from "@/lib/appearance";

/**
 * Aperçu des écrans connectés avec des données d'exemple, pour les captures
 * Playwright (375 px et 1440 px). Inaccessible en production.
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ecran?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { ecran = "accueil" } = await searchParams;
  const appearance = await getAppearance();

  if (ecran === "onboarding") {
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-[560px] content-start gap-6 px-4 pb-10 pt-6">
        <OnboardingForm />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AppNav isAdmin={false} />
      <main className="pt-safe mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pb-[calc(152px+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-12">
        {ecran === "reglages" ? (
          <>
            <PageHeader title="Réglages" back="/apercu" />
            <Card className="grid gap-4 md:max-w-xl">
              <h2 className="text-lg font-semibold">Style</h2>
              <StylePicker current={appearance.style} theme={appearance.theme} unit="kg" />
            </Card>
          </>
        ) : ecran === "entrainement" ? (
          <>
            <PageHeader title="Entraînement" />
            <EmptyState icon={<BarbellIcon size={22} />} title="Tes séances arrivent dans la prochaine version">
              Tu pourras noter tes séries en un tap, retrouver tes records et ton 1RM estimé, et suivre le volume par muscle.
            </EmptyState>
          </>
        ) : (
          <>
            <PageHeader eyebrow="ven. 7 nov." title="Salut Exemple" />
            <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
              <Card className="grid gap-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">Pesée du jour</h2>
                  <span className="text-sm font-medium text-accent-text">Historique</span>
                </div>
                <QuickWeigh initial={85.2} unit="kg" loggedToday={false} />
                <WeightTrend average7={84.86} rate={0.38} status="dans_la_cible" target={{ min: 0.25, max: 0.5 }} unit="kg" />
              </Card>
              <div className="grid content-start gap-4">
                <Card className="grid gap-2">
                  <p className="label-caps flex items-center gap-1.5">
                    <FlagIcon size={14} weight="fill" aria-hidden="true" /> Objectif
                  </p>
                  <h2 className="font-title text-[26px]">Prise de masse</h2>
                  <p className="text-[15px] text-muted">Rythme visé : 0,25 à 0,5 kg par semaine.</p>
                </Card>
                <Card className="grid gap-2">
                  <h2 className="text-lg font-semibold">Cette semaine</h2>
                  <p className="text-[15px] text-muted">
                    Les séances, les calories et les protéines du jour s&apos;afficheront ici dès que l&apos;entraînement et la nutrition
                    seront disponibles.
                  </p>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
