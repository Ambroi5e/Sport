import { PlusIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { RenameTemplateForm, TemplateItems } from "@/components/training/template-forms";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteTemplate, startWorkout } from "../../actions";
import { getTemplate } from "../../data";

export const metadata: Metadata = { title: "Modèle" };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getTemplate(id);
  const items = template.items.map((i) => ({
    id: i.id,
    name: i.exercises?.name ?? "Exercice",
    timed: i.exercises?.measure === "duree",
    sets: i.sets,
    repMin: i.rep_min,
    repMax: i.rep_max,
  }));

  return (
    <>
      <PageHeader back="/entrainement/modeles" eyebrow="Modèle" title={template.name} />
      <div className="grid gap-4 md:max-w-2xl">
        {items.length ? (
          <form action={startWorkout}>
            <input type="hidden" name="templateId" value={template.id} />
            <SubmitButton size="lg" className="w-full" pendingLabel="Démarrage…">
              Démarrer la séance
            </SubmitButton>
          </form>
        ) : null}

        <TemplateItems key={items.map((i) => i.id).join(",")} templateId={template.id} items={items} />

        <Link href={`/entrainement/modeles/${template.id}/ajouter`} className={buttonClasses("secondary", "md", "w-full")}>
          <PlusIcon size={18} weight="bold" aria-hidden="true" />
          Ajouter un exercice
        </Link>

        <Card>
          <RenameTemplateForm templateId={template.id} name={template.name} />
        </Card>

        <ConfirmAction
          action={deleteTemplate.bind(null, template.id)}
          label="Supprimer le modèle"
          confirmLabel="Supprimer le modèle"
          question={`Supprimer le modèle « ${template.name} » ? Tes séances déjà faites restent dans l'historique.`}
        />
      </div>
    </>
  );
}
