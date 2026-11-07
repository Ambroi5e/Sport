import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { setStyle } from "@/app/(app)/reglages/actions";
import { cn } from "@/components/ui/cn";
import { STYLES, type StyleId, type Theme } from "@/lib/appearance";

/**
 * Choix du style. Chaque option est un aperçu rendu dans son propre style
 * (attributs data-style et data-theme) : ce qu'on voit est ce qu'on aura.
 */
export function StylePicker({ current, theme, unit }: { current: StyleId; theme: Theme; unit: "kg" | "lb" }) {
  return (
    <form action={setStyle} className="grid gap-3">
      {STYLES.map((s) => {
        const active = current === s.id;
        return (
          <button
            key={s.id}
            type="submit"
            name="style"
            value={s.id}
            aria-pressed={active}
            data-style={s.id}
            data-theme={theme}
            className={cn(
              "grid gap-3 rounded-control border bg-bg p-4 text-left text-text transition-colors",
              active ? "border-accent-text ring-1 ring-accent-text" : "border-line hover:border-muted",
            )}
          >
            <span className="flex items-center gap-3">
              <span className="font-title flex-1 text-[24px]">{s.name}</span>
              {active ? (
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-text">
                  <CheckCircleIcon size={20} weight="fill" aria-hidden="true" />
                  Choisi
                </span>
              ) : null}
            </span>
            <span className="text-[14px] text-muted">{s.description}</span>
            <span className="flex items-end gap-3" aria-hidden="true">
              <span className="grid flex-1 gap-1 rounded-control border border-line bg-surface px-3 py-2">
                <span className="text-[12px] text-muted">Développé couché</span>
                <span className="font-numeric text-[28px]">
                  72,5<span className="ml-1 font-sans text-[13px] font-semibold text-muted">{unit}</span>
                </span>
              </span>
              <span className="grid h-12 place-items-center rounded-control bg-accent px-4 text-[14px] font-semibold text-on-accent">
                Valider
              </span>
            </span>
          </button>
        );
      })}
    </form>
  );
}
