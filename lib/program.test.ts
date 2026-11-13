import { describe, expect, it } from "vitest";
import { programSuggestions, suggestionText } from "./program";

const program = { starts_on: "2026-11-02", deload_every: 5 };
const bench = { exerciseId: "dc", sets: 4, repMin: 6, repMax: 10, exercise: { equipment: "barre", measure: "charge", primary_muscles: ["pectoraux"] } };
const set = (workoutId: string, date: string, setNumber: number, weightKg: number, reps: number, isLight = false) => ({ exerciseId: "dc", workoutId, date, setNumber, weightKg, reps, isLight });

describe("programSuggestions", () => {
  const normal = [1, 2, 3, 4].map((n) => set("a", "2026-11-03", n, 60, 8));

  it("séance allégée : comme une décharge, 60 % des séries et charge −10 %", () => {
    const [r] = programSuggestions(normal, [bench], program, "2026-11-10", true);
    expect(r?.suggestion).toEqual({ weightKg: 55, reps: 6, kind: "decharge" });
    expect(r?.sets).toHaveLength(2);
    expect(suggestionText(r!.suggestion!, "kg", { repMax: 10 }, true)).toBe("Séance allégée : 55 kg × 6, charge allégée et moins de séries.");
  });

  it("une séance allégée n'est pas la référence de la suivante", () => {
    const light = [1, 2].map((n) => set("b", "2026-11-10", n, 55, 6, true));
    const [r] = programSuggestions([...light, ...normal], [bench], program, "2026-11-12");
    expect(r?.suggestion).toEqual({ weightKg: 60, reps: 9, kind: "repeter" });
    expect(r?.sets).toHaveLength(4);
  });
});
