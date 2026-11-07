import { ListChecksIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateTemplateForm } from "@/components/training/template-forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { startWorkout } from "../actions";
import { getTemplates } from "../data";

export const metadata: Metadata = { title: "Modèles" };

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return (
    <>
      <PageHeader back="/entrainement" title="Modèles" />
      <div className="grid gap-4 md:max-w-2xl">
        <Card>
          <CreateTemplateForm />
        </Card>
        {templates.length === 0 ? (
          <EmptyState icon={<ListChecksIcon size={22} />} title="Aucun modèle pour l'instant">
            Un modèle, c&apos;est ta séance type (Push A, Haut du corps…) : ses exercices, ses séries et ta fourchette de répétitions. Tu le lances ensuite en un tap. Tu peux aussi enregistrer une séance terminée comme modèle.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {templates.map((t) => (
              <li key={t.id}>
                <Card className="grid gap-3">
                  <Link href={`/entrainement/modeles/${t.id}`} className="grid gap-1 hover:opacity-80">
                    <span className="font-title text-[22px]">{t.name}</span>
                    <span className="text-[14px] text-muted">
                      {t.exerciseNames.length ? `${t.exerciseNames.join(", ")} · ${t.totalSets} séries` : "Aucun exercice : touche pour en ajouter"}
                    </span>
                  </Link>
                  {t.exerciseNames.length ? (
                    <form action={startWorkout}>
                      <input type="hidden" name="templateId" value={t.id} />
                      <SubmitButton variant="secondary" className="w-full" pendingLabel="Démarrage…">
                        Démarrer
                      </SubmitButton>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
