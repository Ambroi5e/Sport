import type { Metadata } from "next";
import { SupplementForm } from "@/components/supplements/supplement-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteSupplement, setPaused, updateSupplement } from "../actions";
import { getSupplement } from "../data";

export const metadata: Metadata = { title: "Complément" };

export default async function SupplementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplement = await getSupplement(id);
  return (
    <>
      <PageHeader title={supplement.name} eyebrow="Compléments" back="/nutrition/complements" />
      <div className="grid gap-6 md:max-w-xl">
        <SupplementForm supplement={supplement} action={updateSupplement.bind(null, supplement.id)} submitLabel="Enregistrer" />
        <div className="grid gap-2">
          <form action={setPaused.bind(null, supplement.id, !supplement.paused)}>
            <SubmitButton variant="secondary" className="w-full">
              {supplement.paused ? "Reprendre ce complément" : "Mettre en pause"}
            </SubmitButton>
          </form>
          <p className="text-[13px] text-muted">En pause, il sort de la liste du jour et son historique reste.</p>
        </div>
        <div className="justify-self-start">
          <ConfirmAction
            action={deleteSupplement.bind(null, supplement.id)}
            label="Supprimer ce complément"
            confirmLabel="Supprimer"
            question={`Supprimer « ${supplement.name} » et tout son historique de prises ?`}
          />
        </div>
      </div>
    </>
  );
}
