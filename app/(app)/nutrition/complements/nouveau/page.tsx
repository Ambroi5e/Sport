import type { Metadata } from "next";
import { SupplementForm } from "@/components/supplements/supplement-form";
import { PageHeader } from "@/components/ui/page-header";
import { SUPPLEMENT_NOTICE } from "@/lib/supplements";
import { addSupplement } from "../actions";

export const metadata: Metadata = { title: "Nouveau complément" };

export default function NewSupplementPage() {
  return (
    <>
      <PageHeader title="Nouveau complément" eyebrow="Compléments" back="/nutrition/complements" />
      <div className="grid gap-5 md:max-w-xl">
        <SupplementForm action={addSupplement} submitLabel="Ajouter" />
        <p className="text-[13px] text-muted">{SUPPLEMENT_NOTICE}</p>
      </div>
    </>
  );
}
