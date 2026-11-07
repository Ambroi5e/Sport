"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useActionState, useEffect, useState } from "react";
import { saveWeight, type WeightState } from "@/app/(app)/weight-actions";
import { Button } from "@/components/ui/button";

const STEP = 0.1;

function format(value: number) {
  return value.toFixed(1).replace(".", ",");
}

/**
 * Pesée rapide : valeur préremplie avec la dernière pesée, ajustement par
 * pas de 0,1 et enregistrement en un tap.
 */
export function QuickWeigh({
  initial,
  unit,
  loggedToday,
}: {
  initial: number | null;
  unit: "kg" | "lb";
  loggedToday: boolean;
}) {
  const [value, setValue] = useState<number | null>(initial);
  const [text, setText] = useState(initial === null ? "" : format(initial));
  const [state, action, pending] = useActionState(saveWeight, {} as WeightState);

  useEffect(() => {
    if (state.ok && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(15);
  }, [state]);

  function nudge(delta: number) {
    const next = Math.round(((value ?? 0) + delta) * 10) / 10;
    setValue(next);
    setText(format(next));
  }

  function onType(raw: string) {
    setText(raw);
    const parsed = Number.parseFloat(raw.replace(",", "."));
    setValue(Number.isFinite(parsed) ? parsed : null);
  }

  const saved = state.ok && !pending;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="weight" value={value ?? ""} />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => nudge(-STEP)}
          disabled={value === null}
          aria-label={`Retirer 0,1 ${unit}`}
          className="grid size-14 shrink-0 place-items-center rounded-[6px] border border-line bg-surface-2 transition-transform active:scale-95 disabled:opacity-40"
        >
          <MinusIcon size={22} weight="bold" aria-hidden="true" />
        </button>
        <label className="grid min-w-0 flex-1 justify-items-center">
          <span className="sr-only">Poids en {unit}</span>
          <span className="flex items-baseline gap-1.5">
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              inputMode="decimal"
              placeholder="--,-"
              className="font-numeric w-[4.2ch] bg-transparent text-center text-[56px] text-text placeholder:text-muted focus:outline-none md:text-[64px]"
            />
            <span className="text-lg font-semibold text-muted">{unit}</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => nudge(STEP)}
          disabled={value === null}
          aria-label={`Ajouter 0,1 ${unit}`}
          className="grid size-14 shrink-0 place-items-center rounded-[6px] border border-line bg-surface-2 transition-transform active:scale-95 disabled:opacity-40"
        >
          <PlusIcon size={22} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <Button type="submit" size="lg" disabled={pending || value === null}>
        {saved ? (
          <>
            <CheckIcon size={20} weight="bold" aria-hidden="true" /> Pesée enregistrée
          </>
        ) : loggedToday ? (
          "Mettre à jour la pesée du jour"
        ) : (
          "Enregistrer la pesée"
        )}
      </Button>
      <p aria-live="polite" className="min-h-5 text-center text-[13px] text-muted">
        {state.error ? <span className="text-danger">{state.error}</span> : loggedToday ? "Déjà pesé aujourd'hui : une nouvelle saisie remplace la précédente." : null}
      </p>
    </form>
  );
}
