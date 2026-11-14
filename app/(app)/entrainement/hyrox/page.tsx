import type { Metadata } from "next";
import { HyroxView } from "@/components/training/hyrox-view";
import { PageHeader } from "@/components/ui/page-header";
import { getHyroxRaces } from "./data";

export const metadata: Metadata = { title: "Hyrox" };

/** La course montrée : celle de l'adresse (`?course=`), sinon la plus récente. */
export default async function HyroxPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, races] = await Promise.all([searchParams, getHyroxRaces()]);
  return (
    <>
      <PageHeader title="Hyrox" back="/entrainement" />
      <HyroxView
        races={races}
        selectedId={course}
        addHref="/entrainement/hyrox/ajouter"
        raceHref={(id) => `/entrainement/hyrox?course=${id}`}
        editHref={(id) => `/entrainement/hyrox/${id}`}
      />
    </>
  );
}
