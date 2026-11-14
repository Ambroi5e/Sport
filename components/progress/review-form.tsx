"use client";

import { useActionState } from "react";
import type { ReviewState } from "@/app/(app)/progres/bilan/actions";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { FEELINGS, MAX_REVIEW_NOTE, type SavedReview } from "@/lib/review";

/** Ce que la personne dit de sa semaine : un ressenti en un tap, une note si elle veut. */
export function ReviewForm({ saved, action }: { saved: SavedReview | null; action: (state: ReviewState, formData: FormData) => Promise<ReviewState> }) {
  const [state, formAction] = useActionState(action, {});
  const feeling = state.values?.feeling ?? (saved ? String(saved.feeling) : "");
  return (
    <form action={formAction} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Comment s&apos;est passée ta semaine ?</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {FEELINGS.map((f) => (
            <label key={f.value} className="relative">
              <input type="radio" name="feeling" value={f.value} defaultChecked={feeling === String(f.value)} required className="peer sr-only" />
              <span
                className={cn(
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-control border border-line bg-surface-2 px-1 py-1.5 text-center text-[11px] leading-tight text-muted",
                  "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text",
                )}
              >
                <span className="font-numeric text-[18px] leading-none text-text" aria-hidden="true">
                  {f.value}
                </span>
                {f.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <label htmlFor="note" className="text-sm font-medium">
          Une note pour plus tard (facultatif)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={MAX_REVIEW_NOTE}
          defaultValue={state.values?.note ?? saved?.note ?? ""}
          placeholder="Ce qui a marché, ce qui a coincé, ce que tu changes la semaine prochaine."
          className="w-full rounded-control border border-line bg-surface-2 px-3 py-2.5 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Enregistrement…">{saved ? "Mettre à jour mon bilan" : "Enregistrer mon bilan"}</SubmitButton>
        <p role={state.error ? "alert" : "status"} className={state.error ? "text-[14px] text-danger" : "text-[14px] text-muted"}>
          {state.error ?? (state.saved ? "Bilan enregistré." : "")}
        </p>
      </div>
    </form>
  );
}
