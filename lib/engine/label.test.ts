import { describe, expect, it } from "vitest";
import { isValidBarcode, parseNutritionLabel } from "./label";

describe("isValidBarcode", () => {
  it("accepte les EAN-13, EAN-8 et UPC-A dont la clé est juste", () => {
    expect(isValidBarcode("3017620422003")).toBe(true); // EAN-13
    expect(isValidBarcode("96385074")).toBe(true); // EAN-8
    expect(isValidBarcode("036000291452")).toBe(true); // UPC-A
  });

  it("refuse une clé fausse, des lettres ou une longueur inconnue", () => {
    expect(isValidBarcode("3017620422004")).toBe(false);
    expect(isValidBarcode("30176204220a3")).toBe(false);
    expect(isValidBarcode("123456789")).toBe(false);
    expect(isValidBarcode("")).toBe(false);
  });
});

describe("parseNutritionLabel", () => {
  it("lit la colonne pour 100 g d'une étiquette française", () => {
    const text = [
      "Valeurs nutritionnelles moyennes Pour 100 g Par portion (40 g)",
      "Énergie 1 576 kJ / 374 kcal 630 kJ / 150 kcal",
      "Matières grasses 6,9 g 2,8 g",
      "dont acides gras saturés 1,2 g 0,5 g",
      "Glucides 58,7 g 23 g",
      "dont sucres 1,1 g 0,4 g",
      "Fibres alimentaires 9,7 g 3,9 g",
      "Protéines 13,5 g 5,4 g",
      "Sel 0,02 g <0,01 g",
    ].join("\n");
    expect(parseNutritionLabel(text)).toEqual({
      kcal: 374,
      fatG: 6.9,
      carbsG: 58.7,
      sugarsG: 1.1,
      fiberG: 9.7,
      proteinG: 13.5,
      saltG: 0.02,
      kcalEstimated: false,
    });
  });

  it("supporte les fautes de lecture courantes et l'énergie sur deux lignes", () => {
    const text = ["ENERGIE 1647 kJ", "394 kcal", "Matiéres grasses 1O,5 g", "Glucides 62 g", "dont sucres 25 g", "Proteines l2 g", "Sel < 0,5 g"].join("\n");
    const v = parseNutritionLabel(text);
    expect(v.kcal).toBe(394);
    expect(v.fatG).toBe(10.5);
    expect(v.carbsG).toBe(62);
    expect(v.sugarsG).toBe(25);
    expect(v.proteinG).toBe(12);
    expect(v.saltG).toBe(0);
  });

  it("lit le texte réel de Tesseract sur une étiquette, « g » lu comme un 9 compris", () => {
    // Sortie de Tesseract (français) sur une étiquette rendue puis photographiée.
    const text = [
      "Valeurs nutritionnelles moyennes Pour100g Par portion (40 g)",
      "Énergie 1576 kJ 630 kJ",
      "374 kcal 150 kcal",
      "Matières grasses 6,9 g 2,89",
      "dont acides gras saturés 129 0,5g",
      "Glucides 589 239",
      "dont sucres 11g 04g",
      "Fibres alimentaires 9,79 3,9g",
      "Protéines 13,5g 5,4g",
      "Sel 0,02 g <0,01 g",
    ].join("\n");
    const v = parseNutritionLabel(text);
    expect(v).toMatchObject({ kcal: 374, fatG: 6.9, carbsG: 58, fiberG: 9.7, proteinG: 13.5, saltG: 0.02 });
  });

  it("lit le format kJ/kcal 1576/374, et convertit les kJ seuls", () => {
    expect(parseNutritionLabel("Energie (kJ/kcal) 1576/374 630/150").kcal).toBe(374);
    expect(parseNutritionLabel("Valeur énergétique 1 000 kJ").kcal).toBe(239);
  });

  it("déduit les calories des macros quand elles manquent, et le signale", () => {
    const v = parseNutritionLabel("Lipides 10 g\nGlucides 20 g\nProtéines 30 g");
    expect(v.kcal).toBe(290);
    expect(v.kcalEstimated).toBe(true);
  });

  it("ne confond pas les acides gras saturés avec les matières grasses", () => {
    const v = parseNutritionLabel("dont acides gras saturés 3 g\nMatières grasses 8 g");
    expect(v.fatG).toBe(8);
  });

  it("rend des valeurs vides sur un texte illisible", () => {
    const v = parseNutritionLabel("~~ ## illisible");
    expect([v.kcal, v.proteinG, v.carbsG, v.fatG]).toEqual([null, null, null, null]);
    expect(v.kcalEstimated).toBe(false);
  });
});
