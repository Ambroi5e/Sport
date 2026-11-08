import { describe, expect, it } from "vitest";
import { checkinAverages, readiness, readinessScore, readinessSeries } from ".";

const ok = { sleep: 4, soreness: 2, energy: 4, stress: 2 };

describe("note de forme", () => {
  it("remet les quatre notes dans le même sens", () => {
    expect(readinessScore({ sleep: 5, soreness: 1, energy: 5, stress: 1 })).toBe(5);
    expect(readinessScore({ sleep: 1, soreness: 5, energy: 1, stress: 5 })).toBe(1);
    expect(readinessScore(ok)).toBe(4);
    expect(readinessScore({ sleep: 3, soreness: 3, energy: 4, stress: 2 })).toBe(3.5);
  });

  it("bonne à 3,5 et plus sans note à son pire", () => {
    expect(readiness(ok)).toEqual({ score: 4, level: "bonne", factors: [] });
    expect(readiness({ sleep: 3, soreness: 3, energy: 4, stress: 2 }).level).toBe("bonne");
    // Très bonne nuit mais stress au maximum : pas « bonne ».
    expect(readiness({ sleep: 5, soreness: 1, energy: 5, stress: 5 }).level).toBe("moyenne");
  });

  it("basse sous 2,5, ou après une très mauvaise nuit, ou avec de fortes courbatures", () => {
    expect(readiness({ sleep: 2, soreness: 4, energy: 2, stress: 4 }).level).toBe("basse");
    expect(readiness({ sleep: 1, soreness: 1, energy: 5, stress: 1 }).level).toBe("basse");
    expect(readiness({ sleep: 5, soreness: 5, energy: 5, stress: 1 }).level).toBe("basse");
  });

  it("explique ce qui tire la forme vers le bas", () => {
    expect(readiness({ sleep: 2, soreness: 4, energy: 3, stress: 3 }).factors).toEqual(["sleep", "soreness"]);
    expect(readiness({ sleep: 3, soreness: 3, energy: 2, stress: 4 }).factors).toEqual(["energy", "stress"]);
  });
});

describe("courbe et moyennes", () => {
  const checkins = [
    { date: "2026-10-28", ...ok, sleep: 2 },
    { date: "2026-11-03", ...ok },
    { date: "2026-11-05", ...ok, energy: 2 },
    { date: "2026-11-06", ...ok },
  ];

  it("donne la note de chaque jour et sa moyenne sur 7 jours", () => {
    const { points, average } = readinessSeries(checkins, "2026-11-01", "2026-11-06");
    expect(points.map((p) => p.value)).toEqual([4, 3.5, 4]);
    // Le 3, la moyenne compte aussi le check-in du 28 octobre (3,5), d'avant la période.
    expect(average[0]).toEqual({ date: "2026-11-03", value: 3.75 });
    expect(average.at(-1)?.value).toBeCloseTo(11.5 / 3);
  });

  it("compare la semaine aux 7 jours d'avant", () => {
    const { current, previous, count } = checkinAverages(checkins, "2026-11-06");
    expect(count).toBe(3);
    expect(current.energy).toBe(3.3);
    expect(current.sleep).toBe(4);
    expect(previous.sleep).toBe(2);
    expect(checkinAverages([], "2026-11-06").current.sleep).toBeNull();
  });
});
