import { CheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import type { WeekDay } from "@/lib/engine";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function sessions(n: number) {
  return `${n} séance${n > 1 ? "s" : ""}`;
}

/** Semaine en cours : séances faites face aux séances prévues, jour par jour. */
export function WeekCard({ days, done, planned }: { days: WeekDay[]; done: number; planned: number | null }) {
  const habitual = days.filter((d) => d.planned).map((d) => NAMES[d.weekday - 1]);
  return (
    <Card aria-labelledby="semaine-titre" className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="semaine-titre" className="text-lg font-semibold">
          Cette semaine
        </h2>
        <Link href="/entrainement" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
          Entraînement
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
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <li key={d.date} className="grid justify-items-center gap-1.5">
            <span className={cn("text-[12px]", d.isToday ? "font-semibold text-text" : "text-muted")} aria-hidden="true">
              {LETTERS[d.weekday - 1]}
            </span>
            <span
              className={cn(
                "grid size-9 place-items-center rounded-full",
                d.sessions > 0 ? "bg-accent text-on-accent" : d.planned ? "border-2 border-muted/60" : "",
                d.isToday && "outline-2 outline-offset-2 outline-accent-text",
              )}
              aria-hidden="true"
            >
              {d.sessions > 0 ? <CheckIcon size={16} weight="bold" /> : d.planned ? null : <span className="size-1.5 rounded-full bg-line" />}
            </span>
            <span className="sr-only">
              {NAMES[d.weekday - 1]}
              {d.isToday ? " (aujourd'hui)" : ""} : {d.sessions > 0 ? sessions(d.sessions) : d.planned ? "jour habituel, pas de séance" : "repos"}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-muted">
        {habitual.length ? (
          <>Cercles : tes jours habituels ({habitual.join(", ")}). Point : jour de repos.</>
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
