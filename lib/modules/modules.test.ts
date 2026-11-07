import { describe, expect, it } from "vitest";
import { defaultModules } from ".";
import { addDays, daysBetween, localDate, weekStart } from "../dates";

describe("modules par défaut", () => {
  it("active la musculation pour une prise de masse, pas l'endurance", () => {
    const modules = defaultModules("prise_de_masse");
    expect(modules).toContain("musculation");
    expect(modules).not.toContain("endurance");
  });

  it("active l'endurance pour un marathon, pas la musculation", () => {
    const modules = defaultModules("marathon");
    expect(modules).toContain("endurance");
    expect(modules).not.toContain("musculation");
  });

  it("n'a pas de doublon", () => {
    const modules = defaultModules("hyrox");
    expect(new Set(modules).size).toBe(modules.length);
  });
});

describe("dates", () => {
  it("donne la date locale dans le fuseau demandé", () => {
    // 23 h 30 UTC le 6 novembre = 0 h 30 le 7 à Paris
    expect(localDate("Europe/Paris", new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-07");
    expect(localDate("America/New_York", new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-06");
  });

  it("ajoute des jours et mesure un écart", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-11-07", "2027-04-12")).toBe(156);
  });

  it("trouve le lundi de la semaine", () => {
    expect(weekStart("2026-11-07")).toBe("2026-11-02"); // samedi
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // dimanche
    expect(weekStart("2026-11-09")).toBe("2026-11-09"); // lundi
  });
});
