import { describe, expect, it } from "vitest";
import { hyroxBests, hyroxDeltas, hyroxSegment, hyroxSummary, normalizeSplits, parseClock } from "./hyrox";

// Courses : 300, 310, 315, 320, 325, 330, 335, 340 (2 575 s). Ateliers : 2 300 s.
const FULL = [300, 280, 310, 190, 315, 330, 320, 290, 325, 300, 330, 150, 335, 340, 340, 420];

describe("hyroxSegment", () => {
  it("alterne course et atelier, dans l'ordre de l'épreuve", () => {
    expect(hyroxSegment(0)).toEqual({ round: 1, station: null });
    expect(hyroxSegment(1)).toEqual({ round: 1, station: "skierg" });
    expect(hyroxSegment(14)).toEqual({ round: 8, station: null });
    expect(hyroxSegment(15)).toEqual({ round: 8, station: "wall_balls" });
  });
});

describe("normalizeSplits", () => {
  it("rend toujours seize temps, ou rien quand aucun n'est noté", () => {
    expect(normalizeSplits([300, 280])).toHaveLength(16);
    expect(normalizeSplits([300, 280])![2]).toBeNull();
    expect(normalizeSplits(Array(16).fill(null))).toBeNull();
    expect(normalizeSplits(null)).toBeNull();
  });
});

describe("hyroxSummary", () => {
  it("sépare course, ateliers et transitions", () => {
    expect(hyroxSummary(FULL, 5300)).toEqual({ runSeconds: 2575, stationSeconds: 2300, transitionSeconds: 425, runFade: 21 });
  });

  it("ne donne pas de transitions quand les segments dépassent le temps total", () => {
    expect(hyroxSummary(FULL, 4800).transitionSeconds).toBeNull();
  });

  it("ne somme pas ce qui est incomplet", () => {
    const partial = FULL.map((s, i) => (i === 1 ? null : s));
    expect(hyroxSummary(partial, 5300)).toEqual({ runSeconds: 2575, stationSeconds: null, transitionSeconds: null, runFade: 21 });
    expect(hyroxSummary(null, 5300).runSeconds).toBeNull();
  });
});

describe("hyroxDeltas", () => {
  it("compare segment par segment, sans inventer ce qui manque", () => {
    const previous = FULL.map((s, i) => (i === 0 ? s + 12 : i === 3 ? null : s));
    const deltas = hyroxDeltas(FULL, previous);
    expect(deltas[0]).toBe(-12);
    expect(deltas[1]).toBe(0);
    expect(deltas[3]).toBeNull();
    expect(hyroxDeltas(FULL, null).every((d) => d === null)).toBe(true);
  });
});

describe("hyroxBests", () => {
  it("garde le meilleur de chaque segment et somme le temps idéal", () => {
    const older = { id: "a", date: "2026-05-10", seconds: 5600, splits: FULL.map((s) => s + 10) };
    const newer = { id: "b", date: "2026-11-08", seconds: 5300, splits: FULL.map((s, i) => (i === 15 ? s + 60 : s)) };
    const { bests, idealSeconds } = hyroxBests([newer, older]);
    expect(bests[0]).toEqual({ seconds: 300, raceId: "b", date: "2026-11-08" });
    expect(bests[15]).toEqual({ seconds: 430, raceId: "a", date: "2026-05-10" });
    expect(idealSeconds).toBe(2575 + 2300 + 10);
  });

  it("n'a pas de temps idéal tant qu'un segment n'a jamais été noté", () => {
    const { bests, idealSeconds } = hyroxBests([{ id: "a", date: "2026-05-10", seconds: 5600, splits: FULL.map((s, i) => (i === 4 ? null : s)) }]);
    expect(bests[4]).toBeNull();
    expect(idealSeconds).toBeNull();
    expect(hyroxBests([{ id: "c", date: "2026-05-10", seconds: 5600, splits: null }]).idealSeconds).toBeNull();
  });
});

describe("parseClock", () => {
  it.each([
    ["4:35", 275],
    ["04:05", 245],
    ["1:24:35", 5075],
    ["75:10", 4510],
  ])("lit %s", (text, seconds) => {
    expect(parseClock(text)).toBe(seconds);
  });

  it.each(["", "435", "4:75", "1:75:00", "abc", "4:5"])("refuse « %s »", (text) => {
    expect(parseClock(text)).toBeNull();
  });
});
