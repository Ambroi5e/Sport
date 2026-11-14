/** Courses : rayon deviné, besoins de la semaine, arrondi d'achat, coût de la liste, budget, coût par jour. */

/** Rayons, dans l'ordre où on les traverse en magasin. */
export const AISLES = ["fruits_legumes", "viandes_poissons", "frais", "feculents", "epicerie", "surgeles", "boissons", "hygiene", "autre"] as const;
export type Aisle = (typeof AISLES)[number];

/**
 * Mots qui trahissent un rayon, sans accents. L'ordre compte : le premier rayon
 * qui reconnaît le nom l'emporte (« lait de coco » va en épicerie avant le frais,
 * « pomme de terre » en légumes avant « pomme »).
 */
const AISLE_WORDS: readonly (readonly [Aisle, readonly string[]])[] = [
  ["surgeles", ["surgele", "congele", "glace", "sorbet"]],
  ["hygiene", ["savon", "shampoo", "dentifrice", "papier toilette", "essuie", "lessive", "eponge", "sac poubelle", "deodorant", "rasoir", "liquide vaisselle", "mouchoir", "gel douche"]],
  ["boissons", ["eau ", "eau petillante", "jus", "cafe", "the ", "tisane", "soda", "sirop", "biere", "vin ", "boisson"]],
  ["epicerie", ["lait de coco", "beurre de cacahuete", "puree d'amande", "sauce", "conserve", "huile", "vinaigre", "moutarde", "epice", "sel", "poivre", "sucre", "miel", "confiture", "chocolat", "biscuit", "amande", "noix", "noisette", "cacahuete", "whey", "proteine", "thon en boite", "sardine", "pois chiche", "lentille", "haricot rouge", "haricots rouges", "tomate pelee", "concentre", "bouillon", "levure", "compote", "cereale", "muesli", "granola", "curry", "cacao"]],
  ["feculents", ["riz", "pate", "spaghetti", "penne", "coquillette", "semoule", "quinoa", "boulgour", "avoine", "farine", "pain", "tortilla", "wrap", "galette", "ble", "nouille", "gnocchi", "polenta", "baguette", "brioche"]],
  ["viandes_poissons", ["poulet", "dinde", "boeuf", "steak", "viande", "porc", "jambon", "lardon", "saucisse", "agneau", "veau", "canard", "saumon", "thon", "cabillaud", "poisson", "crevette", "colin", "truite", "maquereau", "escalope", "blanc de", "bacon", "merguez"]],
  ["frais", ["lait", "yaourt", "skyr", "fromage", "beurre", "creme", "oeuf", "tofu", "mozzarella", "emmental", "comte", "feta", "ricotta", "petit suisse", "petits suisses", "parmesan", "houmous", "kefir"]],
  ["fruits_legumes", ["pomme de terre", "patate", "pomme", "banane", "orange", "citron", "fraise", "framboise", "myrtille", "fruit", "raisin", "poire", "peche", "kiwi", "mangue", "ananas", "melon", "avocat", "tomate", "carotte", "courgette", "brocoli", "epinard", "salade", "oignon", "ail", "poivron", "concombre", "champignon", "legume", "haricot vert", "haricots verts", "chou", "aubergine", "poireau", "courge", "betterave", "radis", "persil", "basilic", "coriandre", "gingembre", "clementine", "abricot"]],
];

function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .trim();
}

/** Un mot-clé compte s'il commence un mot du nom : « sel » ne reconnaît pas « vaisselle ». */
function hasWord(name: string, word: string): boolean {
  let from = 0;
  for (;;) {
    const at = name.indexOf(word, from);
    if (at < 0) return false;
    if (at === 0 || !/[a-z]/.test(name[at - 1])) return true;
    from = at + 1;
  }
}

/** Rayon probable d'un article d'après son nom ; « autre » quand rien ne le dit. */
export function guessAisle(name: string): Aisle {
  const n = `${plain(name)} `;
  for (const [aisle, words] of AISLE_WORDS) if (words.some((w) => hasWord(n, w))) return aisle;
  return "autre";
}

export type FoodAmount = { foodId: string; grams: number };
/** Une recette : le poids du plat (cuit s'il a été pesé, sinon la somme) et ses ingrédients crus. */
export type RecipeParts = { totalG: number; items: readonly FoodAmount[] };

/**
 * Ce qui a été mangé, ramené aux aliments à acheter : une recette est dépliée en
 * ses ingrédients, au prorata de la part mangée. Additionné par aliment.
 */
export function ingredientsEaten(eaten: readonly FoodAmount[], recipes: ReadonlyMap<string, RecipeParts>): FoodAmount[] {
  const totals = new Map<string, number>();
  const add = (foodId: string, grams: number, depth: number) => {
    const recipe = recipes.get(foodId);
    // Une recette dans une recette se déplie aussi ; la profondeur borne une boucle éventuelle.
    if (recipe && recipe.totalG > 0 && recipe.items.length && depth < 3) {
      for (const item of recipe.items) add(item.foodId, (item.grams * grams) / recipe.totalG, depth + 1);
    } else if (grams > 0) totals.set(foodId, (totals.get(foodId) ?? 0) + grams);
  };
  for (const e of eaten) add(e.foodId, e.grams, 0);
  return [...totals].map(([foodId, grams]) => ({ foodId, grams })).sort((a, b) => b.grams - a.grams);
}

/** Quantité d'achat : au-dessus de ce qu'il faut, arrondie à 50 g, 100 g puis 250 g. */
export function purchaseGrams(grams: number): number {
  if (grams <= 0) return 0;
  const step = grams <= 100 ? 50 : grams <= 1000 ? 100 : 250;
  return Math.ceil(grams / step - 1e-9) * step;
}

/** Coût d'une quantité, en euros, au centime. */
export function costOf(grams: number, pricePerKg: number): number {
  return Math.round((grams * pricePerKg) / 10) / 100;
}

export type ListCost = { total: number; priced: number; unpriced: number };

/** Total estimé d'une liste : seuls les articles dont on connaît le poids et le prix comptent. */
export function listCost(items: readonly { grams: number | null; pricePerKg: number | null }[]): ListCost {
  let cents = 0;
  let priced = 0;
  for (const item of items) {
    if (item.grams === null || item.pricePerKg === null) continue;
    cents += Math.round(item.grams * item.pricePerKg) / 10;
    priced += 1;
  }
  return { total: Math.round(cents) / 100, priced, unpriced: items.length - priced };
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export type BudgetStatus = {
  /** Dépensé depuis le lundi de la semaine. */
  spent: number;
  /** Ce qu'il reste ; négatif quand le budget est dépassé ; null sans budget. */
  remaining: number | null;
  /** Part du budget dépensée (1 = tout) ; null sans budget. */
  ratio: number | null;
  /** Moyenne par semaine sur les semaines précédentes notées (quatre au plus) ; null sans achat. */
  average: number | null;
};

/** Budget de la semaine qui commence le lundi `weekStart`. */
export function budgetStatus(budget: number | null, purchases: readonly { on: string; amount: number }[], weekStart: string): BudgetStatus {
  const weekEnd = shift(weekStart, 7);
  const from = shift(weekStart, -28);
  let spent = 0;
  let before = 0;
  let oldest: string | null = null;
  for (const p of purchases) {
    if (p.on >= weekStart && p.on < weekEnd) spent += p.amount;
    else if (p.on >= from && p.on < weekStart) {
      before += p.amount;
      if (oldest === null || p.on < oldest) oldest = p.on;
    }
  }
  spent = Math.round(spent * 100) / 100;
  // On ne divise que par les semaines écoulées depuis le premier achat noté.
  const weeks = oldest ? Math.ceil((Date.parse(weekStart) - Date.parse(oldest)) / (7 * 86_400_000)) : 0;
  return {
    spent,
    remaining: budget === null ? null : Math.round((budget - spent) * 100) / 100,
    ratio: budget === null || budget <= 0 ? null : spent / budget,
    average: weeks > 0 ? Math.round((before / weeks) * 100) / 100 : null,
  };
}

/** En dessous, trop d'aliments sans prix : on ne donne pas de coût par jour. */
export const MIN_PRICE_COVERAGE = 0.5;

export type DayCost = {
  /** Coût moyen par jour de ce qui a un prix ; null quand la couverture est trop faible. */
  perDay: number | null;
  /** Part des calories mangées dont on connaît le prix, de 0 à 1. */
  coverage: number;
};

/**
 * Coût de ce qu'on mange, d'après le journal (recettes déjà dépliées) et les prix
 * connus. Le chiffre ne couvre que les aliments qui ont un prix : il n'est pas
 * extrapolé, la couverture dit ce qu'il laisse de côté.
 */
export function dayCost(eaten: readonly (FoodAmount & { kcal: number })[], prices: ReadonlyMap<string, number>, days: number): DayCost {
  let kcal = 0;
  let pricedKcal = 0;
  let cost = 0;
  for (const e of eaten) {
    kcal += e.kcal;
    const price = prices.get(e.foodId);
    if (price === undefined) continue;
    pricedKcal += e.kcal;
    cost += (e.grams * price) / 1000;
  }
  const coverage = kcal > 0 ? pricedKcal / kcal : 0;
  return { perDay: coverage >= MIN_PRICE_COVERAGE && days > 0 ? Math.round((cost / days) * 100) / 100 : null, coverage };
}
