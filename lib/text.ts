/** Clé de recherche : sans accents ni majuscules (« Œuf » et « oeuf » se trouvent). */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/Œ/g, "oe")
    .replace(/Æ/g, "ae")
    .toLowerCase();
}
