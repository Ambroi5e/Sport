/** Compléments : libellés et ce qu'un écran affiche d'un complément. */
import type { Adherence, SupplementMoment } from "@/lib/engine";

export const MOMENT_LABELS: Record<SupplementMoment, string> = {
  matin: "Matin",
  midi: "Midi",
  avant_seance: "Avant la séance",
  apres_seance: "Après la séance",
  soir: "Soir",
  coucher: "Au coucher",
};

export const MAX_SUPPLEMENTS = 30;

export type Supplement = {
  id: string;
  name: string;
  dose: string | null;
  moment: SupplementMoment;
  paused: boolean;
  takenToday: boolean;
  adherence: Adherence;
};

/** « 5 jours sur 7 », « 1 jour sur 2 » ; rien tant qu'aucun jour ne compte. */
export function adherenceText(a: Adherence): string {
  if (!a.counted) return "";
  return `${a.taken} jour${a.taken > 1 ? "s" : ""} sur ${a.counted}`;
}

/** Rappel général : Fonte ne conseille ni complément ni dose. */
export const SUPPLEMENT_NOTICE =
  "Fonte ne recommande aucun complément ni aucune dose : cette liste sert à cocher ce que tu prends déjà. En cas de traitement, de grossesse, de problème de santé ou de doute, demande conseil à ton médecin ou à ton pharmacien.";
