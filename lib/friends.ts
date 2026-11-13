import { Constants, type Enums } from "@/lib/supabase/database.types";

export type ShareCategory = Enums<"share_category">;

export const SHARE_CATEGORIES = Constants.public.Enums.share_category;

/** Chaque catégorie, et ce qu'un ami voit exactement quand elle est ouverte. */
export const SHARE_LABELS: Record<ShareCategory, { label: string; detail: string }> = {
  seances: { label: "Séances et sports", detail: "Tes 20 dernières séances (nom, durée, séries, volume) et tes sports notés. Pas tes notes." },
  records: { label: "Records", detail: "Ta meilleure série sur chaque exercice." },
  poids: { label: "Poids", detail: "Tes pesées des 90 derniers jours." },
  mensurations: { label: "Mesures", detail: "Ta dernière mesure de chaque endroit du corps." },
  nutrition: { label: "Nutrition", detail: "Tes totaux par jour sur 7 jours : calories, protéines, glucides, lipides. Pas tes repas." },
  forme: { label: "Forme du jour", detail: "Tes check-ins des 14 derniers jours : sommeil, courbatures, énergie, stress." },
};

export function isShareCategory(value: unknown): value is ShareCategory {
  return typeof value === "string" && (SHARE_CATEGORIES as readonly string[]).includes(value);
}

export type Friend = { id: string; name: string; since: string; shownToMe: ShareCategory[]; shownByMe: ShareCategory[] };

/** Un ami qui n'a pas encore donné son prénom reste nommable. */
export function friendName(displayName: string | null): string {
  return displayName?.trim() || "Sans prénom";
}

/** « Séances et sports, poids » : ce qui est montré, en une ligne. */
export function categoryList(categories: readonly ShareCategory[]): string {
  const words = SHARE_CATEGORIES.filter((c) => categories.includes(c)).map((c) => SHARE_LABELS[c].label.toLowerCase());
  return words.length ? words.join(", ") : "rien";
}

/** Un code d'ami bien formé, quelle que soit la casse ou la ponctuation saisie. */
export const FRIEND_CODE = /^AMI[A-HJKMNP-Z2-9]{8}$/;

export function normalizeFriendCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
