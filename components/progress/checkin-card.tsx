"use client";

import { BatteryHighIcon, BatteryLowIcon, BatteryMediumIcon } from "@phosphor-icons/react";
import { useActionState, useState, type ReactNode } from "react";
import type { CheckinState } from "@/app/(app)/progres/forme/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { CHECKIN_FIELDS, readiness, type Checkin, type CheckinField, type ReadinessLevel } from "@/lib/engine";
import { CHECKIN_SCALES, FACTOR_LABELS, formatScore, HEALTH_REMINDER, LEVEL_ADVICE, LEVEL_LABELS } from "@/lib/readiness";

const LEVEL_STYLE: Record<ReadinessLevel, { icon: ReactNode; className: string }> = {
  bonne: { icon: <BatteryHighIcon size={20} weight="bold" aria-hidden="true" />, className: "text-success" },
  moyenne: { icon: <BatteryMediumIcon size={20} weight="bold" aria-hidden="true" />, className: "text-warning" },
  basse: { icon: <BatteryLowIcon size={20} weight="bold" aria-hidden="true" />, className: "text-danger" },
};

/**
 * Forme du jour en dix secondes : quatre notes de 1 à 5, puis la note de forme et
 * le conseil du jour. Refaire le check-in le même jour le corrige.
 */
export function CheckinCard({
  action,
  current,
  link,
}: {
  action: (state: CheckinState, formData: FormData) => Promise<CheckinState>;
  current: Checkin | null;
  /** Lien à droite du titre (la courbe, depuis l'accueil). */
  link?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(async (prev: CheckinState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.saved) setEditing(false);
    return result;
  }, {});
  const [notes, setNotes] = useState<Partial<Checkin>>(current ?? {});
  const complete = CHECKIN_FIELDS.every((f) => notes[f] !== undefined);
  const showForm = editing || current === null;

  return (
    <Card aria-labelledby="forme-titre" className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="forme-titre" className="text-lg font-semibold">
          Forme du jour
        </h2>
        {link}
      </div>

      {showForm ? (
        <form action={formAction} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-5">
            {CHECKIN_FIELDS.map((field) => (
              <Scale key={field} field={field} value={notes[field]} onChange={(n) => setNotes((prev) => ({ ...prev, [field]: n }))} />
            ))}
          </div>
          {state.error ? (
            <p role="alert" className="text-[14px] text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton disabled={!complete} pendingLabel="Enregistrement…" className="flex-1 sm:flex-none">
              Enregistrer
            </SubmitButton>
            {current && editing ? (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <Summary checkin={current!} onEdit={() => setEditing(true)} />
      )}
    </Card>
  );
}

function Scale({ field, value, onChange }: { field: CheckinField; value: number | undefined; onChange: (n: number) => void }) {
  const scale = CHECKIN_SCALES[field];
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-sm font-medium">{scale.label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative">
            <input type="radio" name={field} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span
              className={cn(
                "font-numeric flex h-11 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 text-[17px]",
                "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
              )}
            >
              {n}
              {n === 1 ? <span className="sr-only"> : {scale.low.toLowerCase()}</span> : n === 5 ? <span className="sr-only"> : {scale.high.toLowerCase()}</span> : null}
            </span>
          </label>
        ))}
      </div>
      <p className="flex justify-between text-[12px] text-muted" aria-hidden="true">
        <span>{scale.low}</span>
        <span>{scale.high}</span>
      </p>
    </fieldset>
  );
}

function Summary({ checkin, onEdit }: { checkin: Checkin; onEdit: () => void }) {
  const { score, level, factors } = readiness(checkin);
  const style = LEVEL_STYLE[level];
  return (
    <div className="grid gap-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span>
          <span className="font-numeric text-[28px]">{formatScore(score)}</span> <span className="text-[15px] text-muted">sur 5</span>
        </span>
        <span className={cn("inline-flex items-center gap-1.5 text-[15px] font-semibold", style.className)}>
          {style.icon}
          {LEVEL_LABELS[level]}
        </span>
      </p>
      <p className="text-[15px]">{LEVEL_ADVICE[level]}</p>
      {factors.length ? <p className="text-[14px] text-muted">À surveiller : {factors.map((f) => FACTOR_LABELS[f]).join(", ")}.</p> : null}
      {level !== "bonne" ? <p className="text-[13px] text-muted">{HEALTH_REMINDER}</p> : null}
      <Button variant="secondary" onClick={onEdit} className="justify-self-start">
        Modifier
      </Button>
    </div>
  );
}
