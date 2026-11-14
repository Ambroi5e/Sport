import { hyroxSegment, type HyroxStation } from "@/lib/engine";
import { formatDuration } from "@/lib/sports";

/** Nom et distance (ou répétitions) de chaque atelier, dans l'ordre de l'épreuve. */
export const STATION_LABELS: Record<HyroxStation, { label: string; detail: string }> = {
  skierg: { label: "SkiErg", detail: "1 000 m" },
  sled_push: { label: "Sled push", detail: "50 m" },
  sled_pull: { label: "Sled pull", detail: "50 m" },
  burpees: { label: "Burpees sautés", detail: "80 m" },
  rameur: { label: "Rameur", detail: "1 000 m" },
  farmers: { label: "Farmers carry", detail: "200 m" },
  fentes: { label: "Fentes avec sac", detail: "100 m" },
  wall_balls: { label: "Wall balls", detail: "100 répétitions" },
};

/** « Course 3 » ou « Sled pull ». */
export function segmentLabel(index: number): string {
  const { round, station } = hyroxSegment(index);
  return station ? STATION_LABELS[station].label : `Course ${round}`;
}

/** Temps total d'une course : entre 5 minutes et 10 heures, comme toute activité. */
export const MIN_RACE_S = 5 * 60;
export const MAX_RACE_S = 600 * 60;
export const MAX_SPLIT_S = 7200;

/** Chiffres tapés au pavé numérique vers « 4:35 » ou « 1:24:35 » : les deux-points se placent seuls. */
export function clockInput(value: string, maxDigits: number): string {
  const d = value.replace(/\D/g, "").slice(0, maxDigits);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, -2)}:${d.slice(-2)}`;
  return `${d.slice(0, -4)}:${d.slice(-4, -2)}:${d.slice(-2)}`;
}

/** Écart avec la fois d'avant : « −0:12 », « +1:05 », « = ». */
export function formatDelta(seconds: number): string {
  if (seconds === 0) return "=";
  return `${seconds < 0 ? "−" : "+"}${formatDuration(Math.abs(seconds))}`;
}
