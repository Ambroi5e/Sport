import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** Champ avec libellé toujours visible, aide et erreur reliées pour les lecteurs d'écran. */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  suffix,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  suffix?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-12 w-full rounded-[6px] border bg-surface-2 px-3 text-base text-text placeholder:text-muted",
            "transition-colors duration-[120ms] focus:border-accent focus:outline-none",
            error ? "border-danger" : "border-line",
            suffix && "pr-12",
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
