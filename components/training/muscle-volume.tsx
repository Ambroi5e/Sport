import { WEEKLY_SETS_LANDMARK, volumeZone } from "@/lib/engine";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type Muscle } from "@/lib/training";
import { cn } from "@/components/ui/cn";

const SCALE = 24;
const ZONE_TEXT = { bas: "sous le repère", repere: "dans le repère", haut: "au-dessus du repère" } as const;
const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * Séries effectives par muscle sur la semaine, face au repère général de 10 à
 * 20 séries. Un repère, pas une prescription : la couleur double toujours un texte.
 */
export function MuscleVolume({ perMuscle, planned = false }: { perMuscle: Record<string, number>; planned?: boolean }) {
  const all = MUSCLE_GROUPS.flatMap((g) => g.muscles);
  const worked = all.filter((m) => (perMuscle[m] ?? 0) > 0);
  const rest = all.filter((m) => !(perMuscle[m] > 0));
  const band = { left: (WEEKLY_SETS_LANDMARK.min / SCALE) * 100, width: ((WEEKLY_SETS_LANDMARK.max - WEEKLY_SETS_LANDMARK.min) / SCALE) * 100 };

  if (worked.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        {planned ? "Aucune série prévue." : "Aucune série validée cette semaine. Le volume par muscle s'affichera après ta première séance."}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3">
        {worked.map((m: Muscle) => {
          const value = perMuscle[m];
          const zone = volumeZone(value);
          return (
            <li key={m} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="font-medium">{MUSCLE_LABELS[m]}</span>
                <span className="text-muted">
                  <span className="font-numeric text-[18px] text-text">{numberFormat.format(value)}</span> séries, {ZONE_TEXT[zone]}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <span className="absolute inset-y-0 bg-line" style={{ left: `${band.left}%`, width: `${band.width}%` }} />
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-full", zone === "repere" ? "bg-accent" : zone === "haut" ? "bg-warning" : "bg-muted")}
                  style={{ width: `${Math.min(value / SCALE, 1) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {rest.length ? (
        <p className="text-[13px] text-muted">
          {planned ? "Pas travaillés dans le programme" : "Pas encore travaillés cette semaine"} : {rest.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(", ")}.
        </p>
      ) : null}
      <p className="text-[13px] text-muted">
        Bande grise : repère général de {WEEKLY_SETS_LANDMARK.min} à {WEEKLY_SETS_LANDMARK.max} séries par muscle et par semaine. Un muscle secondaire compte pour une demi-série. C&apos;est un repère, pas une règle : en cas de douleur ou de problème de santé, parles-en à un professionnel.
      </p>
    </div>
  );
}
