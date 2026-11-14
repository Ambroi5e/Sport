"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/components/ui/cn";

/** Case à cocher d'un article : une cible de 56 px, désactivée pendant l'envoi. */
export function RowCheck({ checked, label, children }: { checked: boolean; label: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" aria-label={label} aria-pressed={checked} disabled={pending} className="grid size-14 shrink-0 place-items-center disabled:opacity-60">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-control border transition-colors duration-[120ms]",
          checked ? "border-accent bg-accent text-on-accent" : "border-muted text-transparent",
        )}
      >
        {children}
      </span>
    </button>
  );
}
