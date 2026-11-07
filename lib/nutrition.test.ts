import { describe, expect, it } from "vitest";
import { addParams, dayHref, dayLabel, formatGrams, formatKcal, formatMacro, isDay, portionChip } from "./nutrition";
import { searchKey } from "./text";

describe("libellés et liens de la nutrition", () => {
  it("lien du jour sans paramètre pour aujourd'hui, avec l'ancre du repas", () => {
    expect(dayHref("2026-11-09", "2026-11-09", "diner")).toBe("/nutrition#diner");
    expect(dayHref("2026-11-08", "2026-11-09")).toBe("/nutrition?jour=2026-11-08");
    expect(addParams("collation", "2026-11-09", "2026-11-09")).toBe("repas=collation");
    expect(addParams("collation", "2026-11-08", "2026-11-09")).toBe("repas=collation&jour=2026-11-08");
  });

  it("nomme aujourd'hui, hier, puis la date en toutes lettres", () => {
    expect(dayLabel("2026-11-09", "2026-11-09", "2026-11-08")).toBe("Aujourd'hui");
    expect(dayLabel("2026-11-08", "2026-11-09", "2026-11-08")).toBe("Hier");
    expect(dayLabel("2026-11-02", "2026-11-09", "2026-11-08")).toBe("Lundi 2 novembre");
  });

  it("refuse une date mal formée ou impossible", () => {
    expect(isDay("2026-11-09")).toBe(true);
    expect(isDay("2026-13-40")).toBe(false);
    expect(isDay("9/11/2026")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });

  it("garde le poids d'une portion qui l'indique déjà", () => {
    expect(portionChip("1 bol (40 g)", 40)).toBe("1 bol (40 g)");
    expect(portionChip("1 pot", 125)).toBe("1 pot · 125 g");
  });

  it("formate à la française", () => {
    expect(formatKcal(1849.6).replace(/\s/g, " ")).toBe("1 850");
    expect(formatMacro(8.46)).toBe("8,5");
    expect(formatMacro(42.4)).toBe("42");
    expect(formatGrams(12.5)).toBe("12,5 g");
  });

  it("cherche sans accents ni majuscules", () => {
    expect(searchKey("Œuf entier")).toBe("oeuf entier");
    expect(searchKey("Pâtes CUITES")).toBe("pates cuites");
  });
});
