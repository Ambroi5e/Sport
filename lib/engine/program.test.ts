import { describe, expect, it } from "vitest";
import {
  buildProgram,
  type CatalogExercise,
  deloadSets,
  equivalentExercises,
  isDeloadWeek,
  lastSession,
  loadIncrement,
  nextSessionIndex,
  plannedSetsPerMuscle,
  programWeek,
  projectE1RM,
  setsBudget,
  splitFor,
  suggestNext,
  suggestSets,
} from "./program";

const ex = (id: string, equipment: string, primary: string[], secondary: string[] = [], measure = "charge"): CatalogExercise => ({
  id,
  name: id,
  equipment,
  measure,
  primary,
  secondary,
});

const CATALOG: CatalogExercise[] = [
  ex("couche-barre", "barre", ["pectoraux"], ["triceps", "epaules_avant"]),
  ex("couche-halteres", "halteres", ["pectoraux"], ["triceps", "epaules_avant"]),
  ex("pec-deck", "machine", ["pectoraux"]),
  ex("pompes", "poids_du_corps", ["pectoraux"], ["triceps", "epaules_avant"], "poids_du_corps"),
  ex("rowing-barre", "barre", ["dorsaux"], ["trapezes", "biceps", "epaules_arriere"]),
  ex("rowing-haltere", "halteres", ["dorsaux"], ["epaules_arriere", "biceps"]),
  ex("tirage-vertical", "poulie", ["dorsaux"], ["biceps", "epaules_arriere"]),
  ex("militaire", "barre", ["epaules_avant"], ["epaules_laterales", "triceps"]),
  ex("elevations", "halteres", ["epaules_laterales"]),
  ex("elevations-poulie", "poulie", ["epaules_laterales"]),
  ex("oiseau", "halteres", ["epaules_arriere"], ["trapezes"]),
  ex("curl-barre", "barre", ["biceps"], ["avant_bras"]),
  ex("curl-halteres", "halteres", ["biceps"], ["avant_bras"]),
  ex("barre-front", "barre", ["triceps"]),
  ex("squat", "barre", ["quadriceps", "fessiers"], ["adducteurs", "lombaires"]),
  ex("goblet", "halteres", ["quadriceps", "fessiers"], ["abdominaux"]),
  ex("roumain", "barre", ["ischios", "fessiers"], ["lombaires", "avant_bras"]),
  ex("hip-thrust", "barre", ["fessiers"], ["ischios"]),
  ex("mollets", "machine", ["mollets"]),
  ex("crunch", "poids_du_corps", ["abdominaux"], [], "poids_du_corps"),
  ex("gainage", "poids_du_corps", ["abdominaux"], ["obliques"], "duree"),
];

const byId = new Map(CATALOG.map((e) => [e.id, e]));
const allIds = (sessions: { items: { exerciseId: string }[] }[]) => sessions.flatMap((s) => s.items.map((i) => i.exerciseId));

describe("splitFor", () => {
  it("full body à 2 séances", () => expect(splitFor(2, [])).toEqual(["full", "full"]));
  it("à 3 séances : haut/bas/haut si les priorités sont en haut", () => {
    expect(splitFor(3, ["pectoraux", "dorsaux"])).toEqual(["haut", "bas", "haut"]);
    expect(splitFor(3, ["quadriceps"])).toEqual(["bas", "haut", "bas"]);
    expect(splitFor(3, ["pectoraux", "quadriceps"])).toEqual(["full", "full", "full"]);
    expect(splitFor(3, [])).toEqual(["full", "full", "full"]);
  });
  it("haut/bas à 4, cinq séances variées, PPL ×2 à 6", () => {
    expect(splitFor(4, [])).toEqual(["haut", "bas", "haut", "bas"]);
    expect(splitFor(5, [])).toEqual(["haut", "bas", "push", "pull", "jambes"]);
    expect(splitFor(6, [])).toEqual(["push", "pull", "jambes", "push", "pull", "jambes"]);
  });
  it("borne le nombre de séances entre 2 et 6", () => {
    expect(splitFor(1, [])).toHaveLength(2);
    expect(splitFor(9, [])).toHaveLength(6);
  });
});

describe("setsBudget", () => {
  it("compte environ 3 minutes par série, 9 au moins", () => {
    expect(setsBudget(60)).toBe(20);
    expect(setsBudget(45)).toBe(15);
    expect(setsBudget(20)).toBe(9);
  });
});

describe("buildProgram", () => {
  const base = { sessionsPerWeek: 4, sessionMinutes: 60, equipment: ["barre", "halteres", "machine", "poulie", "poids_du_corps"], priority: [] };

  it("donne un nom par séance et alterne les variantes", () => {
    const sessions = buildProgram(CATALOG, base);
    expect(sessions.map((s) => s.name)).toEqual(["Haut A", "Bas A", "Haut B", "Bas B"]);
    expect(sessions[0].items[0].exerciseId).not.toBe(sessions[2].items[0].exerciseId);
  });

  it("respecte le budget de séries et 5 séries au plus par exercice", () => {
    for (const s of buildProgram(CATALOG, base)) {
      const total = s.items.reduce((sum, item) => sum + item.sets, 0);
      expect(total).toBeLessThanOrEqual(setsBudget(60));
      expect(s.items.every((item) => item.sets >= 3 && item.sets <= 5)).toBe(true);
      expect(new Set(s.items.map((item) => item.exerciseId)).size).toBe(s.items.length);
    }
  });

  it("n'utilise que le matériel disponible, sans exercices en durée", () => {
    const ids = allIds(buildProgram(CATALOG, { ...base, equipment: ["halteres", "poids_du_corps"] }));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => ["halteres", "poids_du_corps"].includes(byId.get(id)!.equipment))).toBe(true);
    expect(ids).not.toContain("gainage");
  });

  it("écarte les exercices à éviter et place ceux qu'on aime", () => {
    const sessions = buildProgram(CATALOG, { ...base, avoided: new Set(["squat"]), liked: new Set(["pec-deck"]) });
    expect(allIds(sessions)).not.toContain("squat");
    expect(sessions[0].items.find((item) => item.muscle === "pectoraux")?.exerciseId).toBe("pec-deck");
  });

  it("garde l'exercice de l'objectif dans chaque séance qui travaille son muscle", () => {
    const sessions = buildProgram(CATALOG, { ...base, goalExerciseId: "couche-halteres" });
    expect(sessions[0].items[0].exerciseId).toBe("couche-halteres");
    expect(sessions[2].items[0].exerciseId).toBe("couche-halteres");
  });

  it("avance les muscles prioritaires, avec une place et des séries en plus", () => {
    const sessions = buildProgram(CATALOG, { ...base, sessionsPerWeek: 3, priority: ["epaules_laterales"] });
    expect(sessions.map((s) => s.name)).toEqual(["Haut A", "Bas", "Haut B"]);
    // Petit muscle : juste après les deux gros exercices, en isolation.
    const haut = sessions[0];
    expect(haut.items.map((item) => item.muscle).slice(0, 4)).toEqual(["pectoraux", "dorsaux", "epaules_laterales", "epaules_laterales"]);
    expect(haut.items[2].sets).toBeGreaterThan(3);
    // Gros muscle : en tête.
    const legs = buildProgram(CATALOG, { ...base, priority: ["ischios"] });
    expect(legs[1].items[0].muscle).toBe("ischios");
  });

  it("fourchettes basses sur les gros exercices en objectif de force", () => {
    const strength = buildProgram(CATALOG, { ...base, strength: true });
    const volume = buildProgram(CATALOG, base);
    expect(strength[0].items[0]).toMatchObject({ repMin: 3, repMax: 6 });
    expect(volume[0].items[0]).toMatchObject({ repMin: 6, repMax: 10 });
    const lateral = volume[0].items.find((item) => item.muscle === "epaules_laterales");
    expect(lateral).toMatchObject({ repMin: 10, repMax: 15 });
  });

  it("préfère les exercices déjà pratiqués à score égal", () => {
    const sessions = buildProgram(CATALOG, { ...base, usage: { "couche-halteres": 12 } });
    expect(sessions[0].items[0].exerciseId).toBe("couche-halteres");
  });

  it("donne toujours le même programme pour les mêmes réglages", () => {
    expect(buildProgram(CATALOG, base)).toEqual(buildProgram(CATALOG, base));
  });
});

describe("plannedSetsPerMuscle", () => {
  it("compte 1 par muscle principal et 0,5 par muscle secondaire", () => {
    const out = plannedSetsPerMuscle([{ items: [{ exerciseId: "couche-barre", sets: 4 }, { exerciseId: "barre-front", sets: 3 }] }], CATALOG);
    expect(out).toEqual({ pectoraux: 4, triceps: 5, epaules_avant: 2 });
  });
});

describe("equivalentExercises", () => {
  it("propose les exercices du même muscle et du même type de mesure, ceux qu'on aime d'abord", () => {
    const list = equivalentExercises(byId.get("couche-barre")!, CATALOG, { liked: new Set(["pec-deck"]) }).map((e) => e.id);
    expect(list[0]).toBe("pec-deck");
    expect(list).toContain("couche-halteres");
    expect(list).not.toContain("pompes");
    expect(list).not.toContain("couche-barre");
  });
  it("filtre par matériel et écarte ceux à éviter", () => {
    const list = equivalentExercises(byId.get("couche-barre")!, CATALOG, { equipment: ["halteres", "machine"], avoided: new Set(["pec-deck"]) });
    expect(list.map((e) => e.id)).toEqual(["couche-halteres"]);
  });
});

describe("loadIncrement", () => {
  it("5 kg à la barre pour les jambes, 2 kg aux haltères, 2,5 kg sinon", () => {
    expect(loadIncrement(byId.get("squat")!)).toBe(5);
    expect(loadIncrement(byId.get("couche-barre")!)).toBe(2.5);
    expect(loadIncrement(byId.get("goblet")!)).toBe(2);
    expect(loadIncrement(byId.get("pec-deck")!)).toBe(2.5);
    expect(loadIncrement({ equipment: "kettlebell", primary: ["fessiers"] })).toBe(4);
  });
});

describe("suggestNext", () => {
  const target = { repMin: 6, repMax: 10 };
  it("monte quand toutes les séries lourdes atteignent le haut de la fourchette", () => {
    const last = [
      { weightKg: 80, reps: 10 },
      { weightKg: 80, reps: 10 },
      { weightKg: 70, reps: 8 },
    ];
    expect(suggestNext(last, target, 2.5)).toEqual({ weightKg: 82.5, reps: 6, kind: "monter" });
  });
  it("répète la charge avec une rep de plus sinon", () => {
    const last = [
      { weightKg: 80, reps: 10 },
      { weightKg: 80, reps: 8 },
    ];
    expect(suggestNext(last, target, 2.5)).toEqual({ weightKg: 80, reps: 9, kind: "repeter" });
  });
  it("décharge : charge −10 % arrondie au pas, bas de fourchette", () => {
    expect(suggestNext([{ weightKg: 100, reps: 8 }], target, 5, true)).toEqual({ weightKg: 90, reps: 6, kind: "decharge" });
    expect(suggestNext([{ weightKg: 67.5, reps: 8 }], target, 2.5, true)).toEqual({ weightKg: 60, reps: 6, kind: "decharge" });
  });
  it("poids du corps sans lest : une rep de plus, sans charge", () => {
    expect(suggestNext([{ weightKg: null, reps: 12 }], target, 2.5)).toEqual({ weightKg: null, reps: 13, kind: "repeter" });
  });
  it("rien sans série faite", () => {
    expect(suggestNext([], target, 2.5)).toBeNull();
    expect(suggestNext([{ weightKg: 50, reps: null }], target, 2.5)).toBeNull();
  });
});

describe("suggestSets", () => {
  const target = { sets: 3, repMin: 8, repMax: 12 };
  it("monte : toutes les séries à la nouvelle charge, bas de fourchette", () => {
    const last = [1, 2, 3].map((n) => ({ setNumber: n, weightKg: 20, reps: 12 }));
    const { suggestion, sets } = suggestSets(last, target, 2);
    expect(suggestion?.kind).toBe("monter");
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [22, 8],
      [22, 8],
      [22, 8],
    ]);
  });
  it("répète : chaque série garde sa charge avec une rep de plus, plafonnée", () => {
    const last = [
      { setNumber: 1, weightKg: 20, reps: 12 },
      { setNumber: 2, weightKg: 20, reps: 10 },
    ];
    const { sets } = suggestSets(last, target, 2);
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [20, 12],
      [20, 11],
      [20, 11],
    ]);
  });
  it("décharge : 60 % des séries", () => {
    const last = [1, 2, 3, 4, 5].map((n) => ({ setNumber: n, weightKg: 50, reps: 10 }));
    const { sets } = suggestSets(last, { ...target, sets: 5 }, 2.5, true);
    expect(sets).toHaveLength(3);
    expect(sets[0]).toMatchObject({ weightKg: 45, reps: 8, repMin: 8, repMax: 12 });
  });
  it("sans historique : bas de fourchette, charge vide", () => {
    const { suggestion, sets } = suggestSets([], target, 2.5);
    expect(suggestion).toBeNull();
    expect(sets).toHaveLength(3);
    expect(sets[0]).toMatchObject({ weightKg: null, reps: 8 });
  });
});

describe("deloadSets", () => {
  it("garde 60 % des séries, une au moins", () => {
    expect(deloadSets(5)).toBe(3);
    expect(deloadSets(4)).toBe(2);
    expect(deloadSets(1)).toBe(1);
  });
});

describe("lastSession", () => {
  const sets = [
    { workoutId: "c", date: "2026-11-05", setNumber: 1, isWarmup: false },
    { workoutId: "b", date: "2026-11-01", setNumber: 2, isWarmup: false },
    { workoutId: "b", date: "2026-11-01", setNumber: 1, isWarmup: false },
    { workoutId: "b", date: "2026-11-01", setNumber: 0, isWarmup: true },
  ];
  it("prend la séance la plus récente, sans échauffement, séries dans l'ordre", () => {
    expect(lastSession(sets).map((s) => s.workoutId)).toEqual(["c"]);
    expect(lastSession(sets, (d) => d >= "2026-11-03").map((s) => s.setNumber)).toEqual([1, 2]);
  });
  it("rien quand tout est écarté", () => expect(lastSession(sets, () => true)).toEqual([]));
});

describe("semaines du programme", () => {
  it("compte les semaines depuis le début", () => {
    expect(programWeek("2026-11-02", "2026-11-02")).toBe(1);
    expect(programWeek("2026-11-02", "2026-11-08")).toBe(1);
    expect(programWeek("2026-11-02", "2026-11-09")).toBe(2);
    expect(programWeek("2026-11-02", "2026-10-01")).toBe(1);
  });
  it("décharge toutes les N semaines", () => {
    expect([1, 2, 3, 4, 5, 6, 10].map((w) => isDeloadWeek(w, 5))).toEqual([false, false, false, false, true, false, true]);
  });
  it("enchaîne la séance qui suit la dernière faite", () => {
    expect(nextSessionIndex(["a", "b", "c"], null)).toBe(0);
    expect(nextSessionIndex(["a", "b", "c"], "a")).toBe(1);
    expect(nextSessionIndex(["a", "b", "c"], "c")).toBe(0);
    expect(nextSessionIndex(["a", "b", "c"], "x")).toBe(0);
    expect(nextSessionIndex([], null)).toBe(-1);
  });
});

describe("projectE1RM", () => {
  const common = { today: "2026-11-07", startsOn: "2026-11-02", deloadEvery: 5, targetKg: 100 };

  it("utilise la pente mesurée quand elle est fiable", () => {
    const history = [
      { date: "2026-10-03", e1rm: 85 },
      { date: "2026-10-17", e1rm: 87 },
      { date: "2026-10-31", e1rm: 89 },
      { date: "2026-11-05", e1rm: 90 },
    ];
    const p = projectE1RM({ ...common, history })!;
    expect(p.source).toBe("mesure");
    expect(p.current).toBe(90);
    expect(p.weeklyGain).toBeGreaterThan(0.9);
    expect(p.weeklyGain).toBeLessThan(1.1);
    expect(p.reachedOn).not.toBeNull();
    expect(p.points[0]).toEqual({ date: "2026-11-07", value: 90 });
  });

  it("plafonne une pente trop raide à 3 % par semaine", () => {
    const history = [
      { date: "2026-10-10", e1rm: 60 },
      { date: "2026-10-24", e1rm: 80 },
      { date: "2026-11-06", e1rm: 90 },
    ];
    expect(projectE1RM({ ...common, history })!.weeklyGain).toBeCloseTo(2.7);
  });

  it("prend le repère du niveau sans historique suffisant ou si ça stagne", () => {
    const one = projectE1RM({ ...common, history: [{ date: "2026-11-01", e1rm: 80 }], level: "debutant" })!;
    expect(one.source).toBe("repere");
    expect(one.weeklyGain).toBeCloseTo(1.2);
    const flat = projectE1RM({
      ...common,
      history: [
        { date: "2026-10-01", e1rm: 90 },
        { date: "2026-10-20", e1rm: 88 },
        { date: "2026-11-05", e1rm: 87 },
      ],
    })!;
    expect(flat.source).toBe("repere");
    expect(flat.weeklyGain).toBeCloseTo(87 * 0.0075);
  });

  it("reste à plat les semaines de décharge", () => {
    const p = projectE1RM({ ...common, history: [{ date: "2026-11-01", e1rm: 80 }], level: "debutant", targetKg: 500, horizonWeeks: 6 })!;
    const gains = p.points.slice(1).map((pt, i) => Math.round((pt.value - p.points[i].value) * 100) / 100);
    // Début le 2 nov. : la semaine du 29 nov. au 5 déc. tombe dans la 5e, en décharge.
    expect(gains).toEqual([1.2, 1.2, 1.2, 0, 1.2, 1.2]);
    expect(p.reachedOn).toBeNull();
  });

  it("donne la date d'atteinte et s'arrête quatre semaines après", () => {
    const p = projectE1RM({ ...common, history: [{ date: "2026-11-01", e1rm: 98 }], level: "debutant" })!;
    expect(p.reachedOn).toBe("2026-11-21");
    expect(p.points.at(-1)!.date).toBe("2026-12-19");
  });

  it("déjà atteint : aujourd'hui", () => {
    expect(projectE1RM({ ...common, history: [{ date: "2026-11-01", e1rm: 105 }] })!.reachedOn).toBe("2026-11-07");
  });

  it("rien sans historique", () => expect(projectE1RM({ ...common, history: [] })).toBeNull());
});
