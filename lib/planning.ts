import { loadTrend, LOWER_MUSCLES, type AdaptReason, type Adaptation, type Conflict, type LoadTrend, type TrainingLoad } from "@/lib/engine";
import { SPORT_LABELS, isSport } from "@/lib/sports";
import { MUSCLE_LABELS, type Muscle } from "@/lib/training";

export const WEEKDAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

function weekdayOf(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** « aujourd'hui », « demain », sinon le jour de la semaine. */
export function dayWord(date: string, today: string): string {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return diff === 0 ? "aujourd'hui" : diff === 1 ? "demain" : WEEKDAY_NAMES[weekdayOf(date) - 1];
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Nom d'un sport prévu ou noté. */
export function sportName(sport: string, label: string | null): string {
  return label ?? (isSport(sport) ? SPORT_LABELS[sport] : sport);
}

/** « jambes » quand tout est sous la ceinture, sinon les muscles nommés. */
function muscleWords(muscles: readonly string[]): string {
  if (muscles.every((m) => LOWER_MUSCLES.has(m))) return "jambes";
  return muscles.map((m) => (MUSCLE_LABELS[m as Muscle] ?? m).toLowerCase()).join(", ");
}

const OFFSET_WORDS: Record<number, string> = { [-1]: "la veille", 0: "le même jour", 1: "le lendemain" };

/** « Padel le lendemain : jambes », « Bas A la veille : jambes ». */
export function conflictText(c: Conflict): string {
  const name = c.kind === "sport" ? sportName(c.sport ?? c.name, c.label) : c.name;
  return `${name} ${OFFSET_WORDS[c.offset] ?? ""} : ${muscleWords(c.muscles)}`;
}

/**
 * Le conseil du jour, en une phrase : ce que Fonte propose et pourquoi. Général
 * et prudent ; `HEALTH_REMINDER` l'accompagne dès que la forme n'est pas bonne.
 */
export function adviceText(advice: { action: Adaptation; reason: AdaptReason }, p: { level: string; session: string; postponeDay: string | null; replacement: string | null }): string {
  switch (advice.action) {
    case "remplacer":
      return `Courbatures marquées : fais plutôt ${p.replacement} aujourd'hui, qui travaille d'autres muscles. ${p.session} sera replacée dans la semaine.`;
    case "decaler":
      return `Mieux vaut te reposer aujourd'hui : ${p.session} passe à ${p.postponeDay}.`;
    case "alleger":
      return advice.reason === "charge"
        ? "Ta charge des 7 derniers jours dépasse ton habitude : fais cette séance allégée, avec moins de séries et des charges à −10 %."
        : advice.reason === "courbatures"
          ? "Courbatures marquées : fais cette séance allégée, avec moins de séries et des charges à −10 %."
          : "Plus de jour libre cette semaine pour la décaler : fais-la allégée (moins de séries, charges à −10 %), ou repose-toi.";
    default:
      return p.level === "bonne" ? "Feu vert : la séance prévue, normalement." : "Séance possible : échauffe-toi bien et ajuste la charge à tes sensations.";
  }
}

export const LOAD_TREND_LABELS: Record<LoadTrend, string> = {
  baisse: "en dessous de ton habitude",
  habituelle: "dans ton habitude",
  hausse: "en hausse",
  "forte-hausse": "en forte hausse",
};

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** « 120 % de ta semaine habituelle, en hausse » ; sans rapport, pourquoi. */
export function loadSummary(load: TrainingLoad): string {
  if (load.ratio === null) return load.acute > 0 ? "Encore trop peu d'historique pour la comparer : il faut trois semaines." : "Rien de noté ces 7 derniers jours.";
  return `${percent.format(load.ratio)} de ta semaine habituelle, ${LOAD_TREND_LABELS[loadTrend(load.ratio)]}.`;
}

/** Sur l'accueil, à côté de la séance du jour : ce que la forme conseille, en quelques mots. */
export const ADAPT_HINTS: Record<Adaptation, string | null> = {
  normal: null,
  alleger: "Version allégée conseillée.",
  decaler: "Forme basse : mieux vaut la décaler.",
  remplacer: "Courbatures : une autre séance irait mieux.",
};
