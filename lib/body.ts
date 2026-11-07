/** Corps et progrès : libellés, formats et constantes partagés entre serveur et client. */

import { Constants, type Enums } from "@/lib/supabase/database.types";

export type BodySite = Enums<"body_site">;
export type PhotoPose = Enums<"photo_pose">;

export const BODY_SITES = Constants.public.Enums.body_site;
export const PHOTO_POSES = Constants.public.Enums.photo_pose;

export const SITE_LABELS: Record<BodySite, string> = {
  cou: "Cou",
  epaules: "Épaules",
  poitrine: "Poitrine",
  bras: "Bras",
  avant_bras: "Avant-bras",
  taille: "Taille",
  hanches: "Hanches",
  cuisse: "Cuisse",
  mollet: "Mollet",
};

export const POSE_LABELS: Record<PhotoPose, string> = { face: "Face", profil: "Profil", dos: "Dos" };
/** « la photo de face » */
export const POSE_PHRASE: Record<PhotoPose, string> = { face: "de face", profil: "de profil", dos: "de dos" };

export function isSite(value: unknown): value is BodySite {
  return typeof value === "string" && (BODY_SITES as readonly string[]).includes(value);
}

export function isPose(value: unknown): value is PhotoPose {
  return typeof value === "string" && (PHOTO_POSES as readonly string[]).includes(value);
}

/** Bucket privé : un dossier par utilisateur, fichiers `<user_id>/<id>.jpg`. */
export const PHOTO_BUCKET = "progress-photos";
/** Durée de vie des liens d'affichage. */
export const SIGNED_URL_SECONDS = 600;
/** Limite du bucket. */
export const PHOTO_MAX_BYTES = 1_048_576;
/** Plus grand côté après réduction sur le téléphone. */
export const PHOTO_MAX_SIDE = 1600;

/** Périodes de la courbe du poids. */
export const WEIGHT_PERIODS = {
  "1m": { days: 30, label: "1 mois" },
  "3m": { days: 91, label: "3 mois" },
  "6m": { days: 182, label: "6 mois" },
  "1a": { days: 365, label: "1 an" },
} as const;
export type WeightPeriod = keyof typeof WEIGHT_PERIODS;

export function isWeightPeriod(value: unknown): value is WeightPeriod {
  return typeof value === "string" && Object.hasOwn(WEIGHT_PERIODS, value);
}

const oneDecimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « 38,5 » */
export function formatCm(cm: number): string {
  return oneDecimal.format(cm);
}

/** Écart signé avec une décimale : « +1,5 », « −0,5 », « 0,0 ». */
export function formatDelta(value: number, digits = 1): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  const text = Math.abs(rounded).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return rounded > 0 ? `+${text}` : rounded < 0 ? `−${text}` : text;
}
