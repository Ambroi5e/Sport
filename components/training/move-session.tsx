import { PushPinIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Conflict } from "@/lib/engine";
import { capitalize, conflictText, WEEKDAY_NAMES } from "@/lib/planning";

export type MoveOption = { date: string; available: boolean; blocked: boolean; taken: string | null; conflicts: Conflict[]; current: boolean };

function weekday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return WEEKDAY_NAMES[day === 0 ? 6 : day - 1];
}

/**
 * Déplacer une séance : un tap sur le jour voulu. Chaque jour dit ce qu'il
 * implique ; rien n'est interdit, sauf un jour où une séance est déjà faite.
 */
export function MoveSession({
  options,
  today,
  pinned,
  moveAction,
  resetAction,
}: {
  options: MoveOption[];
  today: string;
  pinned: boolean;
  moveAction: (formData: FormData) => void | Promise<void>;
  resetAction: () => void | Promise<void>;
}) {
  return (
    <div className="grid gap-4">
      <form action={moveAction}>
        <ul className="grid gap-2">
          {options.map((o) => {
            const notes = [
              o.taken ? `Jour pris : ${o.taken}` : null,
              !o.taken && !o.available ? "Hors de tes jours disponibles" : null,
              !o.taken && o.blocked ? "Jour que tu as libéré cette semaine" : null,
            ].filter((n): n is string => n !== null);
            return (
              <li key={o.date}>
                <button
                  type="submit"
                  name="date"
                  value={o.date}
                  disabled={o.taken !== null}
                  aria-current={o.current ? "true" : undefined}
                  className={cn(
                    "grid w-full gap-1 rounded-control border bg-surface-2 px-4 py-3 text-left transition-colors duration-[120ms]",
                    "hover:bg-line/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface-2",
                    o.current ? "border-accent bg-accent/15" : "border-line",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-semibold">
                      {capitalize(weekday(o.date))} {Number(o.date.slice(8))}
                      {o.date === today ? <span className="font-normal text-muted"> · aujourd&apos;hui</span> : null}
                    </span>
                    {o.current ? <span className="text-[13px] text-muted">place actuelle</span> : null}
                  </span>
                  {notes.map((n) => (
                    <span key={n} className="text-[13px] text-muted">
                      {n}
                    </span>
                  ))}
                  {o.conflicts.map((c, i) => (
                    <span key={i} className="flex items-start gap-1.5 text-[13px] text-muted">
                      <WarningIcon size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                      {conflictText(c)}
                    </span>
                  ))}
                  {!o.taken && notes.length === 0 && o.conflicts.length === 0 ? <span className="text-[13px] text-muted">Rien ne gêne</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </form>
      <p className="text-[13px] text-muted">
        Un avertissement n&apos;interdit rien : il signale une séance ou un sport proche qui travaille les mêmes muscles. La séance garde le jour choisi cette
        semaine, les autres se replacent autour.
      </p>
      {pinned ? (
        <form action={resetAction} className="justify-self-start">
          <SubmitButton variant="secondary" pendingLabel="…">
            <PushPinIcon size={18} aria-hidden="true" /> Remettre en automatique
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
