import { describe, expect, it } from "vitest";
import {
  activityFromSessions,
  ageFromBirthYear,
  bmrMifflin,
  epley1RM,
  kgTo,
  movingAverage,
  rateStatus,
  roundTo,
  tdee,
  toKg,
  weeklyRate,
  type WeighIn,
} from ".";

describe("unités", () => {
  it("convertit kg et lb dans les deux sens", () => {
    expect(kgTo("lb", 100)).toBeCloseTo(220.462, 3);
    expect(toKg("lb", 220.462)).toBeCloseTo(100, 3);
    expect(kgTo("kg", 85)).toBe(85);
  });

  it("arrondit au pas demandé", () => {
    expect(roundTo(72.4, 2.5)).toBe(72.5);
    expect(roundTo(85.26, 0.1)).toBeCloseTo(85.3, 10);
  });
});

describe("poids", () => {
  const series: WeighIn[] = [
    { date: "2026-10-24", kg: 84.0 },
    { date: "2026-10-26", kg: 84.1 },
    { date: "2026-10-28", kg: 84.3 },
    { date: "2026-10-31", kg: 84.6 },
    { date: "2026-11-02", kg: 84.7 },
    { date: "2026-11-04", kg: 84.9 },
    { date: "2026-11-06", kg: 85.0 },
  ];

  it("fait la moyenne des 7 derniers jours seulement", () => {
    // Fenêtre du 31/10 au 06/11 : 84,6 ; 84,7 ; 84,9 ; 85,0
    expect(movingAverage(series, "2026-11-06")).toBeCloseTo(84.8, 10);
  });

  it("renvoie null sans pesée dans la fenêtre", () => {
    expect(movingAverage(series, "2026-12-31")).toBeNull();
  });

  it("retrouve exactement la pente d'une série linéaire", () => {
    // +0,1 kg tous les 2 jours = 0,35 kg par semaine
    const linear: WeighIn[] = [0, 2, 4, 6, 8, 10, 12].map((d, i) => ({
      date: `2026-11-${String(d + 1).padStart(2, "0")}`,
      kg: 84 + 0.1 * i,
    }));
    expect(weeklyRate(linear, "2026-11-13")).toBeCloseTo(0.35, 10);
  });

  it("donne un rythme positif sur une prise de masse irrégulière", () => {
    expect(weeklyRate(series, "2026-11-06")).toBeCloseTo(0.566, 3);
  });

  it("refuse de conclure avec trop peu de pesées", () => {
    expect(weeklyRate(series.slice(0, 3), "2026-10-28")).toBeNull();
  });

  it("refuse de conclure sur moins de 7 jours", () => {
    const tight: WeighIn[] = [
      { date: "2026-11-01", kg: 85 },
      { date: "2026-11-02", kg: 85.1 },
      { date: "2026-11-03", kg: 85.2 },
      { date: "2026-11-04", kg: 85.3 },
    ];
    expect(weeklyRate(tight, "2026-11-04")).toBeNull();
  });

  it("classe le rythme par rapport à la cible de prise de masse", () => {
    const target = { min: 0.25, max: 0.5 };
    expect(rateStatus(0.1, target)).toBe("trop_lent");
    expect(rateStatus(0.3, target)).toBe("dans_la_cible");
    expect(rateStatus(0.8, target)).toBe("trop_rapide");
    expect(rateStatus(null, target)).toBe("inconnu");
  });
});

describe("énergie", () => {
  it("calcule le métabolisme de base de Mifflin-St Jeor", () => {
    // Homme, 85 kg, 195 cm, 22 ans : 850 + 1218,75 - 110 + 5
    expect(bmrMifflin({ sex: "homme", weightKg: 85, heightCm: 195, age: 22 })).toBeCloseTo(1963.75, 2);
    expect(bmrMifflin({ sex: "femme", weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25, 2);
  });

  it("déduit le niveau d'activité des séances par semaine", () => {
    expect(activityFromSessions(0)).toBe("sedentaire");
    expect(activityFromSessions(4)).toBe("modere");
    expect(activityFromSessions(5)).toBe("actif");
  });

  it("applique le facteur d'activité", () => {
    expect(tdee(2000, "modere")).toBeCloseTo(3100, 5);
  });

  it("calcule l'âge depuis l'année de naissance", () => {
    expect(ageFromBirthYear(2004, new Date("2026-11-07T00:00:00Z"))).toBe(22);
  });
});

describe("force", () => {
  it("estime le 1RM avec Epley", () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 3);
    expect(epley1RM(72.5, 8)).toBeCloseTo(91.833, 3);
  });

  it("renvoie la charge pour une seule rep et 0 pour une saisie vide", () => {
    expect(epley1RM(120, 1)).toBe(120);
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(100, 0)).toBe(0);
  });
});
