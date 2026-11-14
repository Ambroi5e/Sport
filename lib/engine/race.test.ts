import { describe, expect, it } from "vitest";
import { daysUntil, estimatedHrMax, hrZoneOf, hrZones, hrZoneTime, predictRace, racePassages, riegel } from "./race";

const run = (id: string, date: string, distanceM: number, seconds: number, avgHr?: number) => ({ id, date, sport: "course", distanceM, seconds, avgHr });

describe("riegel", () => {
  it("rend le même temps sur la même distance", () => {
    expect(riegel(3000, 10_000, 10_000)).toBe(3000);
  });

  it("allonge plus que proportionnellement", () => {
    // 50:00 sur 10 km : 50 × 2,1097^1,06 = 110,3 min sur semi.
    expect(riegel(3000, 10_000, 21_097)).toBe(6619);
    expect(riegel(3000, 10_000, 5000)).toBe(1439);
  });
});

describe("predictRace", () => {
  const today = "2026-11-07";

  it("garde la prédiction la plus rapide parmi les sorties récentes", () => {
    const outings = [run("lent", "2026-11-01", 16_000, 5300), run("vif", "2026-10-20", 10_000, 2880), run("vieux", "2026-05-01", 10_000, 2400)];
    const p = predictRace(outings, 21_097, today)!;
    expect(p.outing.id).toBe("vif");
    expect(p.seconds).toBe(riegel(2880, 10_000, 21_097));
  });

  it("ignore les sorties trop courtes, trop anciennes, sans distance ou d'un autre sport", () => {
    const outings = [
      run("court", "2026-11-01", 2000, 480),
      run("ancien", "2026-08-01", 10_000, 2880),
      { id: "sans", date: "2026-11-02", sport: "course", distanceM: null, seconds: 3000 },
      { id: "velo", date: "2026-11-02", sport: "velo", distanceM: 40_000, seconds: 5000 },
    ];
    expect(predictRace(outings, 10_000, today)).toBeNull();
  });

  it("prend une sortie d'il y a exactement 12 semaines, pas une sortie future", () => {
    expect(predictRace([run("a", "2026-08-15", 10_000, 2880)], 10_000, today)?.outing.id).toBe("a");
    expect(predictRace([run("b", "2026-11-08", 10_000, 2880)], 10_000, today)).toBeNull();
  });
});

describe("racePassages", () => {
  it("donne les passages à allure régulière et l'arrivée", () => {
    expect(racePassages(6300, 21_097)).toEqual([
      { meters: 5000, seconds: 1493 },
      { meters: 10_000, seconds: 2986 },
      { meters: 15_000, seconds: 4479 },
      { meters: 20_000, seconds: 5972 },
      { meters: 21_097, seconds: 6300 },
    ]);
    expect(racePassages(1500, 5000)).toEqual([{ meters: 5000, seconds: 1500 }]);
  });
});

describe("daysUntil", () => {
  it("compte les jours, négatifs après la course", () => {
    expect(daysUntil("2026-11-07", "2026-11-07")).toBe(0);
    expect(daysUntil("2026-11-07", "2027-03-07")).toBe(120);
    expect(daysUntil("2026-11-07", "2026-11-01")).toBe(-6);
  });
});

describe("zones cardiaques", () => {
  it("estime la fréquence maximale par l'âge", () => {
    expect(estimatedHrMax(30)).toBe(187);
    expect(estimatedHrMax(50)).toBe(173);
  });

  it("découpe cinq zones en pourcentage de la fréquence maximale", () => {
    expect(hrZones(190)).toEqual([
      { zone: 1, from: 95, to: 114 },
      { zone: 2, from: 115, to: 133 },
      { zone: 3, from: 134, to: 152 },
      { zone: 4, from: 153, to: 171 },
      { zone: 5, from: 172, to: 190 },
    ]);
  });

  it("utilise la réserve dès que la fréquence de repos est connue", () => {
    const zones = hrZones(190, 50);
    expect(zones[0]).toEqual({ zone: 1, from: 120, to: 134 });
    expect(zones[4]).toEqual({ zone: 5, from: 177, to: 190 });
  });

  it("range une fréquence dans sa zone, sans trou entre deux zones", () => {
    const zones = hrZones(190);
    expect(hrZoneOf(90, zones)).toBe(0);
    expect(hrZoneOf(114, zones)).toBe(1);
    expect(hrZoneOf(115, zones)).toBe(2);
    expect(hrZoneOf(190, zones)).toBe(5);
    expect(hrZoneOf(199, zones)).toBe(5);
  });

  it("additionne le temps des sorties par zone depuis une date", () => {
    const zones = hrZones(190);
    const outings = [run("a", "2026-11-01", 10_000, 3000, 150), run("b", "2026-10-20", 8000, 2400, 150), run("c", "2026-10-25", 6000, 2000, 120), run("d", "2026-11-02", 5000, 1500), run("e", "2026-08-01", 5000, 1500, 170)];
    expect(hrZoneTime(outings, zones, "2026-09-13")).toEqual([0, 0, 2000, 5400, 0, 0]);
  });
});
