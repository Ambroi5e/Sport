/** Bilan de la semaine : chaque rubrique en un chiffre et une phrase. */
import { kgTo, type WeekReview, type WeightUnit } from "@/lib/engine";
import { formatDelta } from "@/lib/body";
import { addDays, formatShortDate } from "@/lib/dates";
import { formatEuros } from "@/lib/groceries";
import { formatKcal, formatMacro } from "@/lib/nutrition";
import { formatScore, LEVEL_LABELS } from "@/lib/readiness";

export const FEELINGS = [
  { value: 1, label: "Très dure" },
  { value: 2, label: "Dure" },
  { value: 3, label: "Correcte" },
  { value: 4, label: "Bonne" },
  { value: 5, label: "Excellente" },
] as const;

export const FEELING_LABELS: Record<number, string> = Object.fromEntries(FEELINGS.map((f) => [f.value, f.label]));

export const MAX_REVIEW_NOTE = 600;

export type SavedReview = { weekStart: string; feeling: number; note: string | null };

/** « du 2 au 8 nov. » */
export function weekLabel(weekStart: string): string {
  return `du ${formatShortDate(weekStart).replace(/^\S+\s/, "")} au ${formatShortDate(addDays(weekStart, 6)).replace(/^\S+\s/, "")}`;
}

export type ReviewTone = "bien" | "attention" | "neutre";
export type ReviewLine = { key: "entrainement" | "nutrition" | "poids" | "forme" | "budget"; title: string; value: string; unit: string; detail: string; tone: ReviewTone; href: string };

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const decimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Les cinq rubriques du bilan. Une rubrique sans données dit ce qui manque, sans rien conclure. */
export function reviewLines(r: WeekReview, unit: WeightUnit): ReviewLine[] {
  const t = r.training;
  const sports = t.sports ? ` ${plural(t.sports, "sport")} en plus (${t.sportsMinutes} min).` : "";
  const setsDetail = t.sets
    ? `${plural(t.sets, "série")} de travail${t.previousSets ? `, ${t.sets === t.previousSets ? "autant que" : `${Math.abs(t.sets - t.previousSets)} de ${t.sets > t.previousSets ? "plus" : "moins"} que`} la semaine d'avant` : ""}.`
    : "";
  const training: ReviewLine = {
    key: "entrainement",
    title: "Entraînement",
    value: String(t.sessions),
    unit: t.planned ? `séance${t.sessions > 1 ? "s" : ""} sur ${t.planned}` : `séance${t.sessions > 1 ? "s" : ""}`,
    detail:
      (t.status === "atteint"
        ? "Toutes les séances prévues sont faites. "
        : t.status === "partiel"
          ? `Il en manque ${t.planned! - t.sessions} : ça arrive, la semaine prochaine repart de zéro. `
          : t.status === "rien"
            ? "Aucune séance cette semaine. Une coupure fait parfois du bien ; reprends par une séance légère. "
            : "") +
      setsDetail +
      sports,
    tone: t.status === "atteint" ? "bien" : t.status === "rien" && !t.sports ? "attention" : "neutre",
    href: "/entrainement",
  };

  const n = r.nutrition;
  const nutrition: ReviewLine =
    n.kcal === null
      ? {
          key: "nutrition",
          title: "Nutrition",
          value: String(n.daysLogged),
          unit: `jour${n.daysLogged > 1 ? "s" : ""} noté${n.daysLogged > 1 ? "s" : ""} sur 7`,
          detail: "Il faut au moins 4 jours notés pour une moyenne qui veuille dire quelque chose.",
          tone: "neutre",
          href: "/nutrition",
        }
      : {
          key: "nutrition",
          title: "Nutrition",
          value: formatKcal(n.kcal),
          unit: "kcal par jour",
          detail:
            `Moyenne sur ${n.daysLogged} jours notés, avec ${formatMacro(n.proteinG!)} g de protéines.` +
            (n.targetKcal === null
              ? " Sans cibles, pas de comparaison."
              : ` Cible moyenne : ${formatKcal(n.targetKcal)} kcal, ${n.kcalStatus === "dans_la_cible" ? "tu y es" : n.kcalStatus === "au_dessus" ? "tu es au-dessus" : "tu es en dessous"}. Protéines ${n.proteinReached ? "tenues" : `sous la cible (${formatMacro(n.targetProteinG!)} g)`}.`),
          tone: n.kcalStatus === null ? "neutre" : n.kcalStatus === "dans_la_cible" && n.proteinReached ? "bien" : "attention",
          href: "/nutrition",
        };

  const w = r.weight;
  const weight: ReviewLine =
    w.average === null
      ? { key: "poids", title: "Poids", value: "—", unit: "", detail: "Il faut au moins deux pesées dans la semaine pour une moyenne.", tone: "neutre", href: "/progres" }
      : {
          key: "poids",
          title: "Poids",
          value: decimal.format(kgTo(unit, w.average)),
          unit: `${unit} de moyenne`,
          detail:
            w.change === null
              ? "Pas assez de pesées la semaine d'avant pour comparer."
              : `${formatDelta(kgTo(unit, w.change), 2)} ${unit} par rapport à la semaine d'avant.` +
                (w.status === "dans_la_cible"
                  ? " C'est le rythme visé."
                  : w.status === "trop_rapide"
                    ? " C'est plus rapide que le rythme visé."
                    : w.status === "trop_lent"
                      ? " C'est plus lent que le rythme visé."
                      : ""),
          tone: w.status === "dans_la_cible" ? "bien" : w.status === "trop_rapide" || w.status === "trop_lent" ? "attention" : "neutre",
          href: "/progres",
        };

  const f = r.readiness;
  const readiness: ReviewLine =
    f.score === null
      ? { key: "forme", title: "Forme", value: "—", unit: "", detail: "Aucun check-in cette semaine : dix secondes le matin suffisent.", tone: "neutre", href: "/progres/forme" }
      : {
          key: "forme",
          title: "Forme",
          value: formatScore(f.score),
          unit: "sur 5",
          detail: `${LEVEL_LABELS[f.level!]} en moyenne, sur ${plural(f.days, "check-in")}.${f.level === "basse" ? " Si la fatigue dure, lève le pied et parles-en à un professionnel de santé." : ""}`,
          tone: f.level === "bonne" ? "bien" : f.level === "basse" ? "attention" : "neutre",
          href: "/progres/forme",
        };

  const b = r.budget;
  const budget: ReviewLine = {
    key: "budget",
    title: "Courses",
    value: formatEuros(b.spent),
    unit: b.budget === null ? (b.spent < 2 ? "dépensé" : "dépensés") : `sur ${formatEuros(b.budget)}`,
    detail:
      b.remaining === null
        ? b.spent
          ? "Pas de budget fixé."
          : "Aucun achat noté cette semaine."
        : b.remaining >= 0
          ? `Il restait ${formatEuros(b.remaining)}.`
          : `Budget dépassé de ${formatEuros(-b.remaining)}.`,
    tone: b.remaining === null ? "neutre" : b.remaining >= 0 ? "bien" : "attention",
    href: "/courses/budget",
  };

  return [training, nutrition, weight, readiness, budget];
}
