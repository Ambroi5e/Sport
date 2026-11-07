import { describe, expect, it } from "vitest";
import { datePercent, dateTicks, niceTicks } from "./charts";

describe("graduations", () => {
  it("encadrent les valeurs avec des pas ronds", () => {
    expect(niceTicks(80.3, 83.7)).toEqual([80, 81, 82, 83, 84]);
    expect(niceTicks(0, 12_400)).toEqual([0, 5000, 10_000, 15_000]);
    expect(niceTicks(0, 9_000)).toEqual([0, 2500, 5000, 7500, 10_000]);
    expect(niceTicks(81.2, 81.9)).toEqual([81.2, 81.4, 81.6, 81.8, 82]);
  });

  it("élargissent une plage nulle", () => {
    const ticks = niceTicks(80, 80);
    expect(ticks[0]).toBeLessThan(80);
    expect(ticks.at(-1)).toBeGreaterThan(80);
  });
});

describe("axe des dates", () => {
  it("place une date en pourcentage de la période", () => {
    expect(datePercent("2026-11-01", "2026-11-01", "2026-11-11")).toBe(0);
    expect(datePercent("2026-11-06", "2026-11-01", "2026-11-11")).toBe(50);
    expect(datePercent("2026-11-01", "2026-11-01", "2026-11-01")).toBe(50);
  });

  it("répartit les dates des graduations", () => {
    expect(dateTicks("2026-11-01", "2026-11-10", 4)).toEqual(["2026-11-01", "2026-11-04", "2026-11-07", "2026-11-10"]);
    expect(dateTicks("2026-11-01", "2026-11-02", 4)).toEqual(["2026-11-01", "2026-11-02"]);
  });
});
