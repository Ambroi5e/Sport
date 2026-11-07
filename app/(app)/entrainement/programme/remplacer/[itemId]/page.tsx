import { BarbellIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReplaceForm } from "@/components/training/replace-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { equivalentExercises } from "@/lib/engine";
import { planLabel } from "@/lib/program";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Equipment, type Muscle } from "@/lib/training";
import { replaceProgramItem } from "../../actions";
import { getActiveProgram, getCatalog, getPreferences, splitPreferences } from "../../data";

export const metadata: Metadata = { title: "Remplacer un exercice" };

export default async function ReplacePage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const [program, catalog, prefs] = await Promise.all([getActiveProgram(), getCatalog(), getPreferences()]);
  const session = program?.sessions.find((s) => s.items.some((i) => i.id === itemId));
  const item = session?.items.find((i) => i.id === itemId);
  if (!program || !session || !item) notFound();

  const { liked, avoided } = splitPreferences(prefs);
  const inSession = new Set(session.items.map((i) => i.exerciseId));
  const current = catalog.find((e) => e.id === item.exerciseId) ?? {
    id: item.exerciseId,
    name: item.exercise.name,
    equipment: item.exercise.equipment,
    measure: item.exercise.measure,
    primary: item.exercise.primary_muscles,
    secondary: item.exercise.secondary_muscles,
  };
  const pick = (equipment?: readonly string[]) => equivalentExercises(current, catalog, { equipment, avoided, liked }).filter((e) => !inSession.has(e.id));
  const sameGear = pick(program.equipment);
  const options = (sameGear.length ? sameGear : pick()).slice(0, 8);

  return (
    <>
      <PageHeader back="/entrainement/programme#seances" eyebrow={session.name} title="Remplacer un exercice" />
      <div className="grid gap-4 md:max-w-2xl">
        <Card className="grid gap-1">
          <p className="label-caps">Actuellement</p>
          <p className="font-title text-[22px]">{item.exercise.name}</p>
          <p className="text-[14px] text-muted">
            {planLabel(item.sets, item.repMin, item.repMax)} · {current.primary.map((m) => MUSCLE_LABELS[m as Muscle]).join(", ")}
          </p>
        </Card>
        {options.length === 0 ? (
          <EmptyState icon={<BarbellIcon size={22} />} title="Pas d'exercice équivalent">
            Aucun autre exercice ne travaille les mêmes muscles de la même façon. Tu peux créer le tien dans la bibliothèque, puis l&apos;ajouter à la séance depuis
            ses réglages.
          </EmptyState>
        ) : (
          <Card>
            <ReplaceForm
              action={replaceProgramItem.bind(null, item.id)}
              current={item.exercise.name}
              options={options.map((e) => ({
                id: e.id,
                name: e.name,
                liked: liked.has(e.id),
                detail: `${EQUIPMENT_LABELS[e.equipment as Equipment]} · ${e.primary.map((m) => MUSCLE_LABELS[m as Muscle]).join(", ")}`,
              }))}
            />
          </Card>
        )}
        <p className="text-[13px] text-muted">Les séries et la fourchette de reps restent les mêmes. La charge suggérée repart de ton historique sur le nouvel exercice.</p>
      </div>
    </>
  );
}
