/**
 * Emballages : clé de contrôle d'un code-barres, et lecture du tableau
 * nutritionnel d'une étiquette à partir du texte reconnu sur la photo.
 */

/** GTIN (EAN-8, UPC-A, EAN-13, GTIN-14) : chiffres seulement, clé de contrôle juste. */
export function isValidBarcode(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  // De droite à gauche, poids 3 puis 1.
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export type LabelValues = {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sugarsG: number | null;
  fiberG: number | null;
  saltG: number | null;
  /** Calories absentes de la photo, déduites des macros (4, 4 et 9 kcal par gramme). */
  kcalEstimated: boolean;
};

/** Minuscules sans accents, pour comparer des libellés lus avec des fautes. */
function normalize(line: string): string {
  return line.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Corrige les confusions les plus courantes dans les nombres (« 1O,5 » → « 10,5 », « l2 » → « 12 »). */
function fixDigits(line: string): string {
  return line
    .replace(/(\d)o/g, (_, d: string) => `${d}0`)
    .replace(/o(?=[.,]\d)/g, "0")
    .replace(/(^|\s)[il](?=\d)/g, (_, space: string) => `${space}1`);
}

const NUMBER = /(<\s*)?(\d+(?:\s*[.,]\s*\d+)?)\s*(m?g)?\b/;

/** Premier nombre après `from`, en grammes ; « < 0,5 g » compte pour 0. */
function firstGrams(line: string, from: number): number | null {
  const m = line.slice(from).match(NUMBER);
  if (!m) return null;
  if (m[1]) return 0;
  const n = Number(m[2].replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return m[3] === "mg" ? n / 1000 : n;
}

type Nutrient = "proteinG" | "carbsG" | "fatG" | "sugarsG" | "fiberG" | "saltG";

/** `sub` : le libellé peut commencer par « dont » (les sucres sont une partie des glucides). */
const LABELS: { key: Nutrient; pattern: RegExp; sub?: boolean }[] = [
  { key: "fatG", pattern: /mati[a-z]{0,2}res?\s*grasses|lipides/ },
  { key: "carbsG", pattern: /glucides|hydrates\s*de\s*carbone/ },
  { key: "sugarsG", pattern: /sucres/, sub: true },
  { key: "fiberG", pattern: /fibres/ },
  { key: "proteinG", pattern: /prot[a-z]{0,2}ines/ },
  { key: "saltG", pattern: /\bsel\b/ },
];

/**
 * Lit les valeurs pour 100 g dans le texte d'une étiquette : sur chaque ligne
 * reconnue, le premier nombre après le libellé (la colonne « pour 100 g » vient
 * en premier sur les étiquettes européennes). Les lignes « dont … » ne comptent
 * que pour les sucres. Tout reste à vérifier par la personne.
 */
export function parseNutritionLabel(text: string): LabelValues {
  const lines = text.split(/\r?\n/).map((l) => fixDigits(normalize(l)));
  const values: LabelValues = { kcal: null, proteinG: null, carbsG: null, fatG: null, sugarsG: null, fiberG: null, saltG: null, kcalEstimated: false };

  for (const { key, pattern, sub } of LABELS) {
    for (const line of lines) {
      const m = line.match(pattern);
      if (!m || m.index === undefined) continue;
      if (!sub && /^\W*dont\b/.test(line)) continue;
      const grams = firstGrams(line, m.index + m[0].length);
      if (grams !== null && grams <= 100) {
        values[key] = grams;
        break;
      }
    }
  }

  values.kcal = readKcal(lines);
  if (values.kcal === null && values.proteinG !== null && values.carbsG !== null && values.fatG !== null) {
    values.kcal = Math.round(values.proteinG * 4 + values.carbsG * 4 + values.fatG * 9);
    values.kcalEstimated = true;
  }
  return values;
}

/** Énergie : « 374 kcal », « kJ/kcal 1576/374 », ou à défaut des kJ convertis. */
function readKcal(lines: string[]): number | null {
  const start = lines.findIndex((l) => /energ|valeur\s*energ/.test(l));
  const zone = start >= 0 ? lines.slice(start, start + 3) : lines;
  for (const line of zone) {
    const pair = line.match(/kj\s*\/\s*kcal\D*?(\d[\d\s]*)\s*(?:kj)?\s*\/\s*(\d{1,3}(?:[.,]\d+)?)/);
    if (pair) return toNumber(pair[2]);
    const kcal = line.match(/(\d{1,3}(?:[.,]\d+)?)\s*kcal/);
    if (kcal) return toNumber(kcal[1]);
  }
  for (const line of zone) {
    const kj = line.match(/(\d{1,2}\s?\d{3}|\d{1,4})(?:[.,]\d+)?\s*kj/);
    if (kj) return Math.round(toNumber(kj[1].replace(/\s/g, "")) / 4.184);
  }
  return null;
}

const toNumber = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
