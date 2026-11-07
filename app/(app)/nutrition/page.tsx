import { ForkKnifeIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Nutrition" };

export default function NutritionPage() {
  return (
    <>
      <PageHeader title="Nutrition" />
      <EmptyState icon={<ForkKnifeIcon size={22} />} title="Le suivi des repas arrive bientôt">
        Repas favoris, « refaire comme hier » et calories et protéines du jour face à tes objectifs.
      </EmptyState>
    </>
  );
}
