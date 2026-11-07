import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { formatLongDate, formatShortDate, weekStart } from "@/lib/dates";
import { formatElapsed, formatVolume } from "@/lib/training";
import { getWorkoutHistory } from "../data";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  const [profile, workouts] = await Promise.all([getProfile(), getWorkoutHistory(120)]);
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

  const weeks: { start: string; items: typeof workouts }[] = [];
  for (const w of workouts) {
    const start = weekStart(w.performedOn);
    const week = weeks.find((x) => x.start === start);
    if (week) week.items.push(w);
    else weeks.push({ start, items: [w] });
  }

  return (
    <>
      <PageHeader back="/entrainement" title="Historique" />
      {weeks.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwiseIcon size={22} />} title="Aucune séance terminée">
          Tes séances apparaîtront ici, regroupées par semaine, dès que tu en auras terminé une.
        </EmptyState>
      ) : (
        <div className="grid gap-6 md:max-w-2xl">
          {weeks.map((week) => {
            const sets = week.items.reduce((sum, w) => sum + w.sets, 0);
            return (
              <section key={week.start} aria-labelledby={`semaine-${week.start}`} className="grid gap-2">
                <h2 id={`semaine-${week.start}`} className="flex items-baseline justify-between gap-3">
                  <span className="label-caps">Semaine du {formatShortDate(week.start)}</span>
                  <span className="text-[13px] text-muted">
                    {week.items.length} séance{week.items.length > 1 ? "s" : ""} · {sets} séries
                  </span>
                </h2>
                <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
                  {week.items.map((w) => (
                    <li key={w.id}>
                      <Link href={`/entrainement/seance/${w.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{w.name}</span>
                          <span className="block text-[13px] text-muted">
                            {formatLongDate(w.performedOn)}
                            {formatElapsed(w.startedAt, w.endedAt) ? ` · ${formatElapsed(w.startedAt, w.endedAt)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="font-numeric block text-[20px]">{w.sets}</span>
                          <span className="block text-[12px] text-muted">{w.volumeKg > 0 ? formatVolume(w.volumeKg, unit) : "séries"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
