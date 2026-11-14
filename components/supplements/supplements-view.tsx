import { CheckIcon, PillIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { RowCheck } from "@/components/groceries/row-check";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { adherenceText, MOMENT_LABELS, SUPPLEMENT_NOTICE, type Supplement } from "@/lib/supplements";

const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" });

/** Les 7 derniers jours en pastilles : pleine = pris, vide = pas pris, pointillée = avant l'ajout. */
function Dots({ supplement }: { supplement: Supplement }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {supplement.adherence.days.map((d) => (
        <span
          key={d.date}
          title={weekday.format(new Date(`${d.date}T00:00:00Z`))}
          className={cn("size-2 rounded-full border", d.taken ? "border-accent bg-accent" : d.counted ? "border-muted" : "border-dashed border-line")}
        />
      ))}
    </span>
  );
}

/**
 * Compléments du jour : un tap coche la prise, un autre la décoche. Sous chaque
 * nom, la régularité des 7 derniers jours, en pastilles et en mots.
 */
export function SupplementsView({
  supplements,
  editHref,
  newHref,
  toggleAction,
}: {
  supplements: Supplement[];
  editHref: (id: string) => string;
  newHref: string;
  toggleAction: (id: string, taken: boolean) => Promise<void>;
}) {
  const active = supplements.filter((s) => !s.paused);
  const paused = supplements.filter((s) => s.paused);
  const left = active.filter((s) => !s.takenToday).length;
  const list = "grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface";

  return (
    <div className="grid gap-5 md:max-w-xl">
      {active.length ? (
        <section aria-labelledby="jour-titre" className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="jour-titre" className="label-caps">
              Aujourd&apos;hui
            </h2>
            <p className="text-[13px] text-muted">{left ? `${left} à prendre` : "Tout est pris"}</p>
          </div>
          <ul className={list}>
            {active.map((s) => (
              <li key={s.id} className="flex items-center">
                <form action={toggleAction.bind(null, s.id, !s.takenToday)}>
                  <RowCheck checked={s.takenToday} label={s.takenToday ? `Décocher ${s.name}` : `Cocher ${s.name} : pris aujourd'hui`}>
                    <CheckIcon size={16} weight="bold" aria-hidden="true" />
                  </RowCheck>
                </form>
                <Link href={editHref(s.id)} className="grid min-h-16 min-w-0 flex-1 content-center gap-1 py-2.5 pr-4 hover:bg-surface-2">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-medium">{s.name}</span>
                    {s.dose ? <span className="shrink-0 text-[13px] text-muted">{s.dose}</span> : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                    {MOMENT_LABELS[s.moment]}
                    <Dots supplement={s} />
                    {adherenceText(s.adherence)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState icon={<PillIcon size={22} />} title={paused.length ? "Aucun complément en cours" : "Aucun complément pour l'instant"}>
          Écris ici ce que tu prends déjà, créatine, vitamine D ou autre : tu le coches chaque jour en un tap et tu vois ta régularité sur la semaine.
        </EmptyState>
      )}

      <Link href={newHref} className={buttonClasses(active.length ? "secondary" : "primary", "md", "w-full")}>
        <PlusIcon size={18} weight="bold" aria-hidden="true" /> Ajouter un complément
      </Link>

      {paused.length ? (
        <section aria-labelledby="pause-titre" className="grid gap-2">
          <h2 id="pause-titre" className="label-caps">
            En pause
          </h2>
          <ul className={list}>
            {paused.map((s) => (
              <li key={s.id}>
                <Link href={editHref(s.id)} className="flex min-h-14 items-baseline gap-2 px-4 py-3 text-muted hover:bg-surface-2">
                  <span className="truncate text-[15px] font-medium">{s.name}</span>
                  {s.dose ? <span className="shrink-0 text-[13px]">{s.dose}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[13px] text-muted">{SUPPLEMENT_NOTICE}</p>
    </div>
  );
}
