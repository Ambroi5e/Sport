import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GramsForm } from "@/components/nutrition/grams-form";
import { Per100 } from "@/components/nutrition/per-100";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { dayHref, dayLabel, MEAL_FROM, MEAL_LABELS } from "@/lib/nutrition";
import { deleteFoodLog, updateFoodLog } from "../../actions";
import { getLog } from "../../data";

export const metadata: Metadata = { title: "Modifier" };

/** Une ligne du journal : changer la quantité ou le repas, ou la retirer. */
export default async function LogEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const log = await getLog(id);

  return (
    <>
      <PageHeader
        title={log.food.name}
        eyebrow={`${MEAL_LABELS[log.meal]} · ${dayLabel(log.day, today, addDays(today, -1))}`}
        back={dayHref(log.day, today, log.meal)}
      />
      <div className="grid gap-5 md:max-w-xl">
        <Per100 food={log.food} />
        <GramsForm
          food={log.food}
          defaultGrams={log.grams}
          lastGrams={null}
          action={updateFoodLog.bind(null, log.id)}
          hidden={{}}
          submitLabel="Enregistrer"
          mealChoice={log.meal}
        />
        {log.food.personal ? (
          <Link href={`/nutrition/aliments/${log.food.id}`} className="justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline">
            Corriger les valeurs de cet aliment
          </Link>
        ) : null}
        <ConfirmAction
          action={deleteFoodLog.bind(null, log.id)}
          label="Retirer du journal"
          confirmLabel="Retirer"
          question={`Retirer ${log.food.name} ${MEAL_FROM[log.meal]} ?`}
        />
      </div>
    </>
  );
}
