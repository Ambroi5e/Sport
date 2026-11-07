import { BarbellIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Entraînement" };

export default function TrainingPage() {
  return (
    <>
      <PageHeader title="Entraînement" />
      <EmptyState icon={<BarbellIcon size={22} />} title="Tes séances arrivent dans la prochaine version">
        Tu pourras noter tes séries en un tap, retrouver tes records et ton 1RM estimé, et suivre le volume par muscle.
      </EmptyState>
    </>
  );
}
