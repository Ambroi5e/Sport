import type { ReactNode } from "react";
import { cn } from "./cn";

/** Choix multiples en pastilles : chaque pastille est une case à cocher. */
export function CheckChips({
  name,
  legend,
  options,
  defaultValues = [],
  hint,
  invalid,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  defaultValues?: readonly string[];
  hint?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <fieldset className="grid gap-2" aria-invalid={invalid || undefined} aria-describedby={hint ? `${name}-aide` : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value}>
            <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="peer sr-only" />
            <span
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-full border bg-surface-2 px-3.5 text-sm font-medium text-muted transition-colors",
                "peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text",
                invalid ? "border-danger" : "border-line",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={`${name}-aide`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
