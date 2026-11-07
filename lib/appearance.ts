import "server-only";
import { cookies } from "next/headers";

/**
 * Apparence choisie dans Réglages : un style (les trois directions visuelles
 * proposées au cadrage) et un thème sombre ou clair. Les deux vivent dans des
 * cookies, lus au rendu serveur pour éviter tout flash au chargement.
 */
export const STYLES = [
  { id: "fonte", name: "Fonte", description: "Graphite et orange sécurité, chiffres condensés." },
  { id: "couloir", name: "Couloir", description: "Piste de nuit et cyan du chrono, angles arrondis." },
  { id: "carnet", name: "Carnet", description: "Carnet au stylo, chiffres en mono, surligneur jaune." },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export type Theme = "dark" | "light";

export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];

/** Couleur de fond par style et thème : barre d'état du téléphone (theme-color). */
const BACKGROUNDS: Record<StyleId, Record<Theme, string>> = {
  fonte: { dark: "#121315", light: "#f4f4f2" },
  couloir: { dark: "#0b1220", light: "#f3f6fa" },
  carnet: { dark: "#17171a", light: "#f6f6f2" },
};

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === "string" && (STYLE_IDS as string[]).includes(value);
}

export async function getAppearance(): Promise<{ style: StyleId; theme: Theme; background: string }> {
  const jar = await cookies();
  const raw = jar.get("style")?.value;
  const style: StyleId = isStyleId(raw) ? raw : "fonte";
  const theme: Theme = jar.get("theme")?.value === "light" ? "light" : "dark";
  return { style, theme, background: BACKGROUNDS[style][theme] };
}
