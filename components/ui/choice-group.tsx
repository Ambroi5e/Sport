import { cn } from "./cn";

/** Groupe de choix exclusifs présentés en pastilles larges, faciles au pouce. */
export function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  required,
  columns = 3,
  invalid,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  columns?: 2 | 3 | 4;
  invalid?: boolean;
}) {
  const grid = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];
  return (
    <fieldset className="grid gap-2" aria-invalid={invalid || undefined}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className={cn("grid gap-2", grid)}>
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              required={required}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-[6px] border bg-surface-2 px-3 py-2 text-center text-[15px] font-medium",
                "transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                invalid ? "border-danger" : "border-line",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
