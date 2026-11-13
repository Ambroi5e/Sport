import { describe, expect, it } from "vitest";
import {
  adaptSession,
  loadTrend,
  moveOptions,
  nextPlanned,
  planWeek,
  postponeTarget,
  recoveryMuscles,
  replacementFor,
  todayOptions,
  trainingLoad,
  workoutMinutes,
  type PlanInput,
  type PlanSession,
} from ".";

// Semaine du lundi 9 au dimanche 15 novembre 2026.
const HAUT = ["dorsaux", "pectoraux", "triceps"];
const BAS = ["fessiers", "ischios", "quadriceps"];
const HA: PlanSession = { id: "ha", name: "Haut A", muscles: HAUT };
const BA: PlanSession = { id: "ba", name: "Bas A", muscles: BAS };
const HB: PlanSession = { id: "hb", name: "Haut B", muscles: HAUT };
const BB: PlanSession = { id: "bb", name: "Bas B", muscles: BAS };

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    today: "2026-11-09",
    sessions: [HA, BA, HB, BB],
    lastDoneBeforeWeek: "bb",
    availableDays: [],
    workouts: [],
    activities: [],
    weeklySports: [],
    pins: [],
    blocked: [],
    ...over,
  };
}

/** Séance prévue chaque jour, du lundi au dimanche (« - » : rien). */
function week(plan: ReturnType<typeof planWeek>): string[] {
  return plan.days.map((d) => d.session?.id ?? "-");
}

const padelMercredi = { weekday: 3, sport: "padel", label: null, minutes: 90, intensity: "intense" as const };

describe("recoveryMuscles", () => {
  it("garde les gros muscles principaux, une fois chacun, sans ceux qui récupèrent vite", () => {
    expect(recoveryMuscles([["quadriceps", "fessiers"], ["ischios"], ["mollets"], ["abdominaux", "quadriceps"]])).toEqual(["fessiers", "ischios", "quadriceps"]);
  });
});

describe("planWeek", () => {
  it("place les séances dans l'ordre sur les jours disponibles", () => {
    const plan = planWeek(input({ availableDays: [1, 2, 4, 5] }));
    expect(week(plan)).toEqual(["ha", "ba", "-", "hb", "bb", "-", "-"]);
    expect(plan.unplaced).toEqual([]);
    expect(plan.days.every((d) => (d.session?.conflicts ?? []).length === 0)).toBe(true);
  });

  it("reprend après la dernière séance faite avant lundi", () => {
    const plan = planWeek(input({ availableDays: [1, 2, 4, 5], lastDoneBeforeWeek: "ba" }));
    expect(week(plan)).toEqual(["hb", "bb", "-", "ha", "ba", "-", "-"]);
  });

  it("écarte les jambes de la veille, du jour et du lendemain d'un padel intense", () => {
    const plan = planWeek(input({ availableDays: [1, 2, 3, 4, 5], weeklySports: [padelMercredi] }));
    expect(week(plan)).toEqual(["ba", "ha", "-", "hb", "bb", "-", "-"]);
    expect(plan.days[2].sports).toEqual([{ date: "2026-11-11", sport: "padel", label: null, minutes: 90, intensity: "intense", done: false }]);
  });

  it("un sport léger ne bloque rien", () => {
    const plan = planWeek(input({ availableDays: [1, 2, 4, 5], weeklySports: [{ ...padelMercredi, intensity: "legere" }] }));
    expect(week(plan)).toEqual(["ha", "ba", "-", "hb", "bb", "-", "-"]);
  });

  it("place quand même une séance qui ne peut pas éviter un conflit, et le dit", () => {
    const plan = planWeek(input({ sessions: [BA], lastDoneBeforeWeek: null, availableDays: [2], weeklySports: [padelMercredi] }));
    expect(week(plan)).toEqual(["-", "ba", "-", "-", "-", "-", "-"]);
    expect(plan.days[1].session!.conflicts).toEqual([
      { date: "2026-11-11", offset: 1, kind: "sport", name: "padel", sport: "padel", label: null, muscles: BAS },
    ]);
  });

  it("tient compte des séances faites : retirées de la semaine et 48 h de récupération", () => {
    const plan = planWeek(input({ today: "2026-11-10", workouts: [{ date: "2026-11-09", templateId: "ba", name: "Bas A", muscles: BAS }] }));
    expect(plan.done).toBe(1);
    expect(plan.remaining.map((s) => s.id)).toEqual(["ha", "hb", "bb"]);
    expect(week(plan)).toEqual(["-", "-", "ha", "-", "hb", "-", "bb"]);
    expect(plan.days[0].workouts).toEqual([{ name: "Bas A", templateId: "ba", isLight: false }]);
  });

  it("une séance de la veille du lundi compte pour la récupération", () => {
    const plan = planWeek(input({ sessions: [BA, HA], lastDoneBeforeWeek: "ha", availableDays: [1, 2], workouts: [{ date: "2026-11-08", templateId: null, name: "Jambes", muscles: BAS }] }));
    expect(week(plan)).toEqual(["ha", "ba", "-", "-", "-", "-", "-"]);
  });

  it("respecte une séance déplacée à la main et place les autres autour", () => {
    const plan = planWeek(input({ pins: [{ templateId: "ba", date: "2026-11-11" }] }));
    expect(week(plan)).toEqual(["ha", "-", "ba", "-", "hb", "-", "bb"]);
    expect(plan.days[2].session!.pinned).toBe(true);
    expect(plan.days[0].session!.pinned).toBe(false);
  });

  it("ignore un déplacement passé ou pour une séance déjà faite", () => {
    const plan = planWeek(
      input({
        today: "2026-11-11",
        availableDays: [3, 5],
        workouts: [{ date: "2026-11-09", templateId: "ha", name: "Haut A", muscles: HAUT }],
        pins: [
          { templateId: "ba", date: "2026-11-10" },
          { templateId: "ha", date: "2026-11-13" },
        ],
      }),
    );
    expect(week(plan)).toEqual(["-", "-", "ba", "-", "hb", "-", "-"]);
    expect(plan.unplaced.map((s) => s.id)).toEqual(["bb"]);
  });

  it("ne place rien un jour retiré à la main", () => {
    const plan = planWeek(input({ availableDays: [1, 2, 4, 5], blocked: ["2026-11-09"] }));
    expect(plan.days[0].session).toBeNull();
    expect(plan.days[0].blocked).toBe(true);
  });

  it("signale les séances ratées et les replace", () => {
    const plan = planWeek(input({ today: "2026-11-11", availableDays: [1, 2, 4, 5] }));
    expect(plan.days[0].missed?.id).toBe("ha");
    expect(plan.days[1].missed?.id).toBe("ba");
    expect(week(plan)).toEqual(["-", "-", "-", "ha", "ba", "-", "-"]);
    expect(plan.unplaced.map((s) => s.id)).toEqual(["hb", "bb"]);
  });

  it("une séance faite un autre jour n'est pas ratée", () => {
    const plan = planWeek(input({ today: "2026-11-11", availableDays: [1, 2, 4, 5], workouts: [{ date: "2026-11-10", templateId: "ha", name: "Haut A", muscles: HAUT }] }));
    expect(plan.days[0].missed).toBeNull();
    expect(plan.days[1].missed?.id).toBe("ba");
  });

  it("un sport noté aujourd'hui remplace le sport fixe du même nom", () => {
    const plan = planWeek(
      input({
        today: "2026-11-11",
        weeklySports: [padelMercredi, { weekday: 6, sport: "foot", label: null, minutes: 60, intensity: "moderee" }],
        activities: [{ date: "2026-11-11", sport: "padel", label: null, minutes: 60, intensity: "moderee" }],
      }),
    );
    expect(plan.days[2].sports.map((s) => [s.sport, s.done])).toEqual([["padel", true]]);
    expect(plan.days[5].sports.map((s) => [s.sport, s.done])).toEqual([["foot", false]]);
  });

  it("sans programme : les sports et les séances faites, rien de prévu", () => {
    const plan = planWeek(input({ sessions: [], lastDoneBeforeWeek: null, weeklySports: [padelMercredi] }));
    expect(week(plan)).toEqual(["-", "-", "-", "-", "-", "-", "-"]);
    expect(plan.remaining).toEqual([]);
    expect(plan.days[2].sports).toHaveLength(1);
  });

  it("nextPlanned : la prochaine séance à partir d'aujourd'hui", () => {
    const plan = planWeek(input({ today: "2026-11-10", availableDays: [1, 4] }));
    expect(nextPlanned(plan)).toMatchObject({ date: "2026-11-12", session: { id: "ha" } });
  });
});

describe("décaler, remplacer, déplacer", () => {
  it("décaler : le jour où la séance irait sans aujourd'hui", () => {
    expect(postponeTarget(input({ availableDays: [1, 4] }), "ha")).toBe("2026-11-12");
    expect(postponeTarget(input({ availableDays: [1] }), "ha")).toBeNull();
  });

  it("remplacer : une séance sur d'autres muscles, sans conflit aujourd'hui", () => {
    const base = input({ sessions: [BA, HA], lastDoneBeforeWeek: "ha" });
    expect(replacementFor(base, "ba")?.id).toBe("ha");
    const hautHier = { date: "2026-11-08", templateId: null, name: "Pecs", muscles: HAUT };
    expect(replacementFor({ ...base, workouts: [hautHier] }, "ba")).toBeNull();
    const full: PlanSession = { id: "fa", name: "Full body A", muscles: [...HAUT, ...BAS].sort() };
    const fullB: PlanSession = { ...full, id: "fb", name: "Full body B" };
    expect(replacementFor(input({ sessions: [full, fullB], lastDoneBeforeWeek: null }), "fa")).toBeNull();
  });

  it("déplacer : chaque jour qui reste, avec ce qu'il implique", () => {
    const options = moveOptions(input({ today: "2026-11-10", sessions: [BA], lastDoneBeforeWeek: null, availableDays: [2, 4, 5], weeklySports: [padelMercredi] }), "ba");
    expect(options.map((o) => o.date)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(options.find((o) => o.current)?.date).toBe("2026-11-13");
    expect(options[0].conflicts.map((c) => c.offset)).toEqual([1]);
    expect(options[2].conflicts.map((c) => c.offset)).toEqual([-1]);
    expect(options[3].conflicts).toEqual([]);
    expect(options[4].available).toBe(false);
  });

  it("déplacer : un jour avec une séance faite est pris", () => {
    const options = moveOptions(
      input({ today: "2026-11-10", workouts: [{ date: "2026-11-10", templateId: null, name: "Séance libre", muscles: [] }], lastDoneBeforeWeek: "bb" }),
      "ha",
    );
    expect(options[0].taken).toBe("Séance libre");
  });
});

describe("charge récente", () => {
  it("durée d'une séance : réelle et bornée, 60 min sans heure de fin", () => {
    expect(workoutMinutes("2026-11-09T18:00:00Z", null)).toBe(60);
    expect(workoutMinutes("2026-11-09T18:00:00Z", "2026-11-09T18:10:00Z")).toBe(20);
    expect(workoutMinutes("2026-11-09T18:00:00Z", "2026-11-09T19:15:00Z")).toBe(75);
    expect(workoutMinutes("2026-11-09T18:00:00Z", "2026-11-09T22:00:00Z")).toBe(150);
  });

  it("rapport des 7 derniers jours sur la moyenne des 28", () => {
    const ago = (d: number) => new Date(Date.UTC(2026, 10, 15 - d)).toISOString().slice(0, 10);
    const weekly = (days: number[]) => days.map((d) => ({ date: ago(d), minutes: 60, effort: 5 }));
    expect(trainingLoad(weekly([0, 7, 14, 21]), "2026-11-15")).toEqual({ acute: 300, chronic: 300, ratio: 1 });
    expect(trainingLoad(weekly([0, 1, 7, 14, 21]), "2026-11-15").ratio).toBe(1.6);
    expect(trainingLoad(weekly([0, 3, 7]), "2026-11-15").ratio).toBeNull();
    expect(trainingLoad([], "2026-11-15")).toEqual({ acute: 0, chronic: 0, ratio: null });
  });

  it("tendance de la charge", () => {
    expect([0.7, 1, 1.3, 1.5].map(loadTrend)).toEqual(["baisse", "habituelle", "hausse", "forte-hausse"]);
  });
});

describe("adaptSession", () => {
  const base = { factors: [], loadRatio: 1, canPostpone: true, canReplace: true } as const;
  it("bonne forme : la séance prévue, allégée si la charge flambe", () => {
    expect(adaptSession({ ...base, level: "bonne" })).toEqual({ action: "normal", reason: "forme" });
    expect(adaptSession({ ...base, level: "bonne", loadRatio: 1.6 })).toEqual({ action: "alleger", reason: "charge" });
  });
  it("forme moyenne : remplacer pour des courbatures, alléger si la charge monte", () => {
    expect(adaptSession({ ...base, level: "moyenne", factors: ["soreness"] })).toEqual({ action: "remplacer", reason: "courbatures" });
    expect(adaptSession({ ...base, level: "moyenne", factors: ["soreness"], canReplace: false })).toEqual({ action: "alleger", reason: "courbatures" });
    expect(adaptSession({ ...base, level: "moyenne", loadRatio: 1.35 })).toEqual({ action: "alleger", reason: "charge" });
    expect(adaptSession({ ...base, level: "moyenne", loadRatio: null })).toEqual({ action: "normal", reason: "forme" });
  });
  it("forme basse : remplacer, sinon décaler, sinon alléger", () => {
    expect(adaptSession({ ...base, level: "basse", factors: ["soreness", "sleep"] })).toEqual({ action: "remplacer", reason: "courbatures" });
    expect(adaptSession({ ...base, level: "basse", factors: ["sleep"] })).toEqual({ action: "decaler", reason: "forme" });
    expect(adaptSession({ ...base, level: "basse", factors: ["sleep"], canPostpone: false })).toEqual({ action: "alleger", reason: "forme" });
  });
});

describe("todayOptions", () => {
  it("rien sans séance prévue aujourd'hui", () => {
    const i = input({ availableDays: [2, 4] });
    expect(todayOptions(i, planWeek(i), null, null)).toBeNull();
  });
  it("sans check-in : les possibilités, pas de conseil", () => {
    const i = input({ sessions: [BA, HA], lastDoneBeforeWeek: "ha", availableDays: [1, 4] });
    expect(todayOptions(i, planWeek(i), null, null)).toMatchObject({ session: { id: "ba" }, postponeTo: "2026-11-12", replacement: { id: "ha" }, readiness: null, advice: null });
  });
  it("forme basse après une mauvaise nuit : décaler", () => {
    const i = input({ sessions: [BA, HA], lastDoneBeforeWeek: "ha", availableDays: [1, 4] });
    const today = todayOptions(i, planWeek(i), { sleep: 1, soreness: 2, energy: 2, stress: 3 }, 1);
    expect(today?.readiness?.level).toBe("basse");
    expect(today?.advice).toEqual({ action: "decaler", reason: "forme" });
  });
});
