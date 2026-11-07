import type { Metadata } from "next";
import { MeasurementsView } from "@/components/progress/measurements-view";
import { ProgressTabs } from "@/components/progress/progress-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { getMeasurements } from "../data";

export const metadata: Metadata = { title: "Mensurations" };

export default async function MeasurementsPage() {
  const rows = await getMeasurements();
  return (
    <>
      <PageHeader title="Progrès" />
      <ProgressTabs current="/progres/mensurations" />
      <MeasurementsView rows={rows} />
    </>
  );
}
