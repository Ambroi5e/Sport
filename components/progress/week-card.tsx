import { CheckIcon, TennisBallIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { WeekDay } from "@/lib/engine";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function sessions(n: number) {
  return `${n} séance${n > 1 ? "s" : ""}`;
}

function dayStatus(d: WeekDay): string {
  const done = [d.sessions > 0 ? sessions(d.sessions) : null, d.sports > 0 ? `${d.sports} sport${d.sports > 1 ? "s" : ""}` : null].filter(Boolean).join(" et ");
  return done || (d.planned ? "séance prévue, pas faite" : "repos");
}

/**
 * Semaine en cours : séances faites face aux séances prévues, jour par jour. Un
 * jour de sport a sa balle, sans compter comme séance de musculation.
 */
export function WeekCard({
  days,
  done,
  planned,
  plan,
  href = "/entrainement",
}: {
  days: WeekDay[];
  done: number;
  planned: number | null;
  /** Avec un programme : les cercles sont les séances placées par le planning, et la séance du jour est nommée. */
  plan?: { today: string | null; hint: string | null; next: string | null };
  href?: string;
}) {
  const habitual = days.filter((d) => d.planned).map((d) => NAMES[d.weekday - 1]);
  return (
    <Card aria-labelledby="semaine-titre" className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="semaine-titre" className="text-lg font-semibold">
          Cette semaine
        </h2>
        <Link href={href} className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
          {plan ? "Ma semaine" : "Entraînement"}
        </Link>
      </div>
      <p className="text-[15px] text-muted">
        <span className="font-numeric text-[28px] text-text">{done}</span>
        {planned ? (
          <>
            {" "}
            sur <span className="font-numeric text-[22px] text-text">{planned}</span> séances prévues
          </>
        ) : (
          ` ${done > 1 ? "séances" : "séance"}`
        )}
      </p>
      {plan && (plan.today || plan.next) ? (
        <p className="text-[15px]">
          {plan.today ? (
            <>
              Aujourd&apos;hui : <span className="font-semibold">{plan.today}</span>.{plan.hint ? ` ${plan.hint}` : ""}
            </>
          ) : (
            <span className="text-muted">Prochaine séance : {plan.next}.</span>
          )}
        </p>
      ) : null}
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <li key={d.date} className="grid justify-items-center gap-1.5">
            <span className={cn("text-[12px]", d.isToday ? "font-semibold text-text" : "text-muted")} aria-hidden="true">
              {LETTERS[d.weekday - 1]}
            </span>
            <span
              className={cn(
                "relative grid size-9 place-items-center rounded-full",
                d.sessions > 0 ? "bg-accent text-on-accent" : d.sports > 0 ? "bg-surface-2 text-accent-text" : d.planned ? "border-2 border-muted/60" : "",
                d.isToday && "outline-2 outline-offset-2 outline-accent-text",
              )}
              aria-hidden="true"
            >
              {d.sessions > 0 ? (
                <CheckIcon size={16} weight="bold" />
              ) : d.sports > 0 ? (
                <TennisBallIcon size={18} weight="bold" />
              ) : d.planned ? null : (
                <span className="size-1.5 rounded-full bg-line" />
              )}
              {d.sessions > 0 && d.sports > 0 ? (
                <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full border border-line bg-surface text-accent-text">
                  <TennisBallIcon size={11} weight="bold" />
                </span>
              ) : null}
            </span>
            <span className="sr-only">
              {NAMES[d.weekday - 1]}
              {d.isToday ? " (aujourd'hui)" : ""} : {dayStatus(d)}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-muted">
        {plan ? (
          <>Cercles : les séances placées par le planning. Balle : un sport. Point : repos.</>
        ) : habitual.length ? (
          <>Cercles : tes jours habituels ({habitual.join(", ")}). Balle : un sport. Point : repos.</>
        ) : (
          <>
            Indique tes jours habituels dans{" "}
            <Link href="/nutrition/objectifs" className="font-medium text-accent-text underline-offset-4 hover:underline">
              tes cibles
            </Link>{" "}
            pour les voir ici.
          </>
        )}
      </p>
    </Card>
  );
}
