/** Open Food Facts : ce qu'une fiche produit donne à Fonte, ramené aux règles d'un aliment. */
import type { Nutrients } from "@/lib/engine";

/** Champs demandés à l'API, et rien d'autre. */
export const OFF_FIELDS = "product_name,product_name_fr,brands,nutriments,serving_quantity,serving_size";

export type OffProduct = {
  product_name?: unknown;
  product_name_fr?: unknown;
  brands?: unknown;
  nutriments?: Record<string, unknown>;
  serving_quantity?: unknown;
  serving_size?: unknown;
};

export type OffFood = {
  name: string;
  brand: string | null;
  /** Valeurs pour 100 g, quand la fiche les donne et qu'elles tiennent debout. */
  per100: Partial<Nutrients>;
  portion: { g: number; label: string } | null;
  /** Calories et trois macros présentes et cohérentes : prêtes à vérifier. */
  complete: boolean;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max).trim() : "");

/** Convertit une fiche ; null si elle n'a même pas de nom utilisable. */
export function fromOpenFoodFacts(product: OffProduct): OffFood | null {
  const name = text(product.product_name_fr, 80) || text(product.product_name, 80);
  if (name.length < 2) return null;
  const brand = text(typeof product.brands === "string" ? product.brands.split(",")[0] : "", 60) || null;

  const n = product.nutriments ?? {};
  const kj = num(n["energy_100g"]);
  const kcalRaw = num(n["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184);
  const macro = (key: string) => {
    const v = num(n[`${key}_100g`]);
    return v === null || v > 100 ? null : round1(v);
  };
  const per100: Partial<Nutrients> = {};
  if (kcalRaw !== null && kcalRaw <= 900) per100.kcal = round1(kcalRaw);
  const proteinG = macro("proteins");
  const carbsG = macro("carbohydrates");
  const fatG = macro("fat");
  if (proteinG !== null) per100.proteinG = proteinG;
  if (carbsG !== null) per100.carbsG = carbsG;
  if (fatG !== null) per100.fatG = fatG;

  const complete =
    per100.kcal !== undefined && proteinG !== null && carbsG !== null && fatG !== null && proteinG + carbsG + fatG <= 100;

  const servingG = num(product.serving_quantity);
  // « 30 g » devient « 1 portion (30 g) » ; « 1 biscuit (12,5 g) » reste tel quel.
  const serving = text(product.serving_size, 26);
  const label = !serving ? "1 portion" : /^\d+(?:[.,]\d+)?\s*(?:g|gr|ml)$/i.test(serving) ? `1 portion (${serving})` : serving;
  const portion = servingG !== null && servingG > 0 && servingG <= 2000 ? { g: round1(servingG), label } : null;

  return { name, brand, per100, portion, complete };
}
