import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FoodForm } from "@/components/nutrition/food-form";
import { LabelReader } from "@/components/nutrition/label-reader";
import { ScanNotice } from "@/components/nutrition/scan-notice";
import { PageHeader } from "@/components/ui/page-header";
import { isValidBarcode } from "@/lib/engine";
import { createFood } from "../../actions";
import { creationContext } from "../../context";
import { findFoodByBarcode, lookupOpenFoodFacts, offPrefill } from "../../scan";

export const metadata: Metadata = { title: "Produit scanné" };

/**
 * Après un scan : un produit déjà connu passe directement à la quantité ; sinon
 * Open Food Facts, puis la photo de l'étiquette si la fiche manque ou est incomplète.
 */
export default async function ScannedCodePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ repas?: string; jour?: string }> }) {
  const { code } = await params;
  if (!isValidBarcode(code)) notFound();
  const ctx = await creationContext(await searchParams);

  const known = await findFoodByBarcode(code);
  if (known) redirect(`/nutrition/ajouter/${known.id}${ctx.query ? `?${ctx.query}` : ""}`);

  const off = await lookupOpenFoodFacts(code);
  const hidden = { ...ctx.hidden, barcode: code };
  const back = `/nutrition/scanner${ctx.query ? `?${ctx.query}` : ""}`;

  return (
    <>
      <PageHeader title={off.status === "found" ? off.food.name : "Nouveau produit"} eyebrow={`Code ${code}`} back={back} />
      {off.status === "found" && off.food.complete ? (
        <div className="grid gap-5 md:max-w-xl">
          <ScanNotice code={code} kind="trouve" />
          <FoodForm action={createFood} hidden={hidden} prefill={offPrefill(off.food)} submitLabel={ctx.submitLabel} />
        </div>
      ) : (
        <div className="grid gap-5 md:max-w-4xl">
          <ScanNotice code={code} kind={off.status === "found" ? "incomplet" : off.status === "unknown" ? "inconnu" : "erreur"} />
          <LabelReader action={createFood} hidden={hidden} base={off.status === "found" ? offPrefill(off.food) : {}} submitLabel={ctx.submitLabel} />
        </div>
      )}
    </>
  );
}
