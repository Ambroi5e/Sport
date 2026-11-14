/** Courses : libellés des rayons, montants et quantités tels qu'on les affiche. */
import { costOf, type Aisle, type Expiry } from "@/lib/engine";
import { formatShortDate } from "@/lib/dates";

export const AISLE_LABELS: Record<Aisle, string> = {
  fruits_legumes: "Fruits et légumes",
  viandes_poissons: "Viandes et poissons",
  frais: "Frais",
  feculents: "Féculents et pain",
  epicerie: "Épicerie",
  surgeles: "Surgelés",
  boissons: "Boissons",
  hygiene: "Hygiène et maison",
  autre: "Autre",
};

/** Jours de journal regardés pour « Depuis mes repas » et le coût par jour. */
export const MEAL_DAYS = 7;
export const MAX_LIST_ITEMS = 150;

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const wholeEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « 13,11 € » ; sans centimes quand le montant est rond (« 50 € »). */
export function formatEuros(amount: number): string {
  return Number.isInteger(amount) ? wholeEuros.format(amount) : euros.format(amount);
}

/** Quantité d'achat : « 900 g », « 1,25 kg ». */
export function formatQuantity(grams: number): string {
  return grams >= 1000 ? `${decimal.format(grams / 1000)} kg` : `${decimal.format(grams)} g`;
}

/** Valeur d'un champ numérique : « 11,9 », vide quand il n'y a rien. */
export function fieldNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : decimal.format(value).replace(/\s/g, "");
}

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  aisle: Aisle;
  checked: boolean;
  foodId: string | null;
  grams: number | null;
  pricePerKg: number | null;
};

/** Coût estimé d'un article ; null sans poids ou sans prix. */
export function itemCost(item: Pick<ShoppingItem, "grams" | "pricePerKg">): number | null {
  return item.grams === null || item.pricePerKg === null ? null : costOf(item.grams, item.pricePerKg);
}

/** Ce qu'il faudrait racheter d'un aliment, d'après les repas notés. */
export type MealNeed = {
  foodId: string;
  name: string;
  /** Grammes mangés sur la période. */
  grams: number;
  /** Grammes en stock, non périmés. */
  stockGrams: number;
  /** Quantité d'achat une fois le stock déduit ; 0 quand le stock suffit. */
  buyGrams: number;
  pricePerKg: number | null;
  inList: boolean;
};

export type Purchase = { id: string; on: string; amount: number; store: string | null };

export const MAX_STOCK_ITEMS = 300;

export type StockItem = { id: string; name: string; quantity: string | null; aisle: Aisle; foodId: string | null; grams: number | null; expiresOn: string | null };

/** La péremption en mots : « Périmé depuis hier », « À finir demain », « Jusqu'au 12 déc. » ; null sans date. */
export function expiryLabel(expiry: Expiry, expiresOn: string | null): string | null {
  if (expiry.days === null || !expiresOn) return null;
  const d = expiry.days;
  if (d < 0) return d === -1 ? "Périmé depuis hier" : `Périmé depuis ${-d} jours`;
  if (expiry.state === "bientot") return d === 0 ? "À finir aujourd'hui" : d === 1 ? "À finir demain" : `À finir dans ${d} jours`;
  return `Jusqu'au ${formatShortDate(expiresOn)}`;
}
