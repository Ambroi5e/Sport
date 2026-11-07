"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import type { FormState } from "@/app/(app)/progres/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { BODY_SITES, formatCm, SITE_LABELS, type BodySite } from "@/lib/body";

/**
 * Saisie de plusieurs zones d'un coup pour un jour. Les valeurs déjà saisies ce
 * jour-là sont préremplies ; la dernière mesure de chaque zone sert d'exemple.
 * Changer la date recharge les valeurs de ce jour.
 */
export function MeasurementsForm({
  action,
  date,
  today,
  minDate,
  current,
  latest,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  date: string;
  today: string;
  minDate: string;
  current: Partial<Record<BodySite, number>>;
  latest: Partial<Record<BodySite, number>>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {} as FormState);
  const value = (site: BodySite) => state.values?.[site] ?? (current[site] === undefined ? "" : formatCm(current[site]!));

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <Field
        id="date"
        name="date"
        type="date"
        label="Date"
        defaultValue={state.values?.date ?? date}
        max={today}
        min={minDate}
        required
        onChange={(e) => {
          if (e.target.value && e.target.value !== date) router.replace(`/progres/mensurations/saisir?date=${e.target.value}`, { scroll: false });
        }}
        className="max-w-60"
      />

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Tour en centimètres</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BODY_SITES.map((site) => (
            <Field
              key={site}
              id={site}
              name={site}
              label={SITE_LABELS[site]}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              suffix="cm"
              defaultValue={value(site)}
              placeholder={latest[site] === undefined ? "" : formatCm(latest[site]!)}
            />
          ))}
        </div>
        <p className="text-[13px] text-muted">
          Laisse vide ce que tu ne mesures pas. Vider une valeur déjà saisie ce jour-là la supprime. En gris : ta dernière mesure.
        </p>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
