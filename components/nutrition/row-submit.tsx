"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/components/ui/cn";

/** Ligne entière qui envoie son formulaire ; désactivée pendant l'envoi pour qu'un double tap n'ajoute qu'une fois. */
export function RowSubmit({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}
