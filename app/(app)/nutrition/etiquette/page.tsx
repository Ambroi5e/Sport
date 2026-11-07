import type { Metadata } from "next";
import { LabelReader } from "@/components/nutrition/label-reader";
import { PageHeader } from "@/components/ui/page-header";
import { createFood } from "../actions";
import { creationContext } from "../context";

export const metadata: Metadata = { title: "Lire une étiquette" };

/** Produit sans code-barres lisible : les valeurs se lisent sur la photo de l'étiquette. */
export default async function LabelPage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string }> }) {
  const ctx = await creationContext(await searchParams);
  return (
    <>
      <PageHeader title="Lire une étiquette" back={ctx.back} />
      <div className="md:max-w-4xl">
        <LabelReader action={createFood} hidden={ctx.hidden} submitLabel={ctx.submitLabel} />
      </div>
    </>
  );
}
