import type { ExerciseRecords, WeightUnit } from "@/lib/engine";
import { formatDuration, formatVolume, formatWeight, type ExerciseMeasure } from "@/lib/training";
import { formatShortDate } from "@/lib/dates";

type Tile = { label: string; value: string; detail: string };

/** Records d'un exercice, adaptés à ce qu'il mesure (charge, répétitions, durée). */
export function recordTiles(records: ExerciseRecords, measure: ExerciseMeasure, unit: WeightUnit): Tile[] {
  const tiles: Tile[] = [];
  if (measure === "duree") {
    if (records.longest) tiles.push({ label: "Plus long", value: formatDuration(records.longest.seconds), detail: formatShortDate(records.longest.date) });
    return tiles;
  }
  if (records.bestE1RM) {
    tiles.push({
      label: "1RM estimé",
      value: `${formatWeight(records.bestE1RM.value, unit)} ${unit}`,
      detail: `${formatWeight(records.bestE1RM.weightKg, unit)} × ${records.bestE1RM.reps}, ${formatShortDate(records.bestE1RM.date)}`,
    });
  }
  if (records.heaviest && records.heaviest.weightKg > 0) {
    tiles.push({
      label: "Charge max",
      value: `${formatWeight(records.heaviest.weightKg, unit)} ${unit}`,
      detail: `${records.heaviest.reps} reps, ${formatShortDate(records.heaviest.date)}`,
    });
  }
  if (records.mostReps) {
    tiles.push({
      label: "Plus de reps",
      value: String(records.mostReps.reps),
      detail: `${records.mostReps.weightKg > 0 ? `à ${formatWeight(records.mostReps.weightKg, unit)} ${unit}, ` : ""}${formatShortDate(records.mostReps.date)}`,
    });
  }
  if (records.bestSessionVolume && records.bestSessionVolume.volume > 0) {
    tiles.push({ label: "Volume en une séance", value: formatVolume(records.bestSessionVolume.volume, unit), detail: formatShortDate(records.bestSessionVolume.date) });
  }
  return tiles;
}

export function RecordTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="grid content-start gap-1 rounded-control bg-surface-2 p-3">
          <dt className="text-[12px] text-muted">{t.label}</dt>
          <dd className="font-numeric text-[26px]">{t.value}</dd>
          <dd className="text-[13px] text-muted">{t.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
