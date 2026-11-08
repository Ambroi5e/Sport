"use client";

import { useActionState } from "react";
import type { ActivityFormState } from "@/app/(app)/entrainement/sports/actions";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Intensity } from "@/lib/engine";
import { activityName, formatMinutes, INTENSITY_LABELS, type Sport } from "@/lib/sports";

/**
 * « Comme la dernière fois » : la dernière activité refaite aujourd'hui, en un tap.
 * Le formulaire complet reste juste en dessous pour changer quoi que ce soit.
 */
export function ActivityRepeat({
  action,
  last,
  today,
}: {
  action: (state: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  last: { sport: Sport; label: string | null; minutes: number; intensity: Intensity };
  today: string;
}) {
  const [state, formAction] = useActionState(action, {} as ActivityFormState);
  return (
    <Card aria-labelledby="comme-derniere-titre" className="grid gap-3">
      <h2 id="comme-derniere-titre" className="label-caps">
        Comme la dernière fois
      </h2>
      <p className="text-[17px] font-semibold">
        {activityName(last.sport, last.label)}
        <span className="font-normal text-muted">
          {" "}
          · {formatMinutes(last.minutes)} · {INTENSITY_LABELS[last.intensity].label.toLowerCase()}
        </span>
      </p>
      <form action={formAction} className="grid gap-2">
        <input type="hidden" name="sport" value={last.sport} />
        <input type="hidden" name="label" value={last.label ?? ""} />
        <input type="hidden" name="minutes" value={last.minutes} />
        <input type="hidden" name="intensity" value={last.intensity} />
        <input type="hidden" name="date" value={today} />
        {state.error ? (
          <p role="alert" className="text-[14px] text-danger">
            {state.error}
          </p>
        ) : null}
        <SubmitButton size="lg" className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Enregistrement…">
          Enregistrer pour aujourd&apos;hui
        </SubmitButton>
      </form>
    </Card>
  );
}
