import { HeartIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { ExercisePreference } from "@/lib/program";

/** J'aime, sans avis, à éviter : pris en compte à la génération des programmes. */
export function PreferenceToggle({ action, current }: { action: (formData: FormData) => void | Promise<void>; current: ExercisePreference | null }) {
  const options: { value: ExercisePreference | ""; label: string; icon?: ReactNode }[] = [
    { value: "aime", label: "J'aime", icon: <HeartIcon size={16} weight={current === "aime" ? "fill" : "regular"} aria-hidden="true" /> },
    { value: "", label: "Sans avis" },
    { value: "evite", label: "À éviter", icon: <ProhibitIcon size={16} aria-hidden="true" /> },
  ];
  return (
    <form action={action} className="grid gap-2">
      <p id="preference-titre" className="text-sm font-medium">
        Dans mes programmes
      </p>
      <div role="group" aria-labelledby="preference-titre" className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const on = (current ?? "") === o.value;
          return (
            <button
              key={o.value || "neutre"}
              type="submit"
              name="preference"
              value={o.value}
              aria-pressed={on}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-control border px-2 text-[14px] font-medium transition-colors",
                on ? "border-accent bg-accent/15 text-text" : "border-line bg-surface-2 text-muted hover:text-text",
              )}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted">
        {current === "aime"
          ? "Proposé en priorité quand tes programmes travaillent ce muscle."
          : current === "evite"
            ? "Écarté des prochains programmes et des remplacements proposés."
            : "Fonte le propose selon ton matériel et tes habitudes."}
      </p>
    </form>
  );
}
