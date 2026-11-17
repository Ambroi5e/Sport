import { describe, expect, it } from "vitest";
import { normalizeExerciseName, parseCsv, parseLocalDateTime, parseStrongDuration, readStrengthCsv, suggestExercise } from ".";

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-01-15 18:30:00,"Push, lourd",1h 5m,Bench Press (Barbell),W,40,10,0,0,,,
2024-01-15 18:30:00,"Push, lourd",1h 5m,Bench Press (Barbell),1,80,5,0,0,"note ""perso""",,8
2024-01-15 18:30:00,"Push, lourd",1h 5m,Bench Press (Barbell),2,80,5,0,0,,,
2024-01-15 18:30:00,"Push, lourd",1h 5m,Plank,1,0,0,0,60,,,
2024-01-15 18:30:00,"Push, lourd",1h 5m,Running,1,0,0,5,1500,,,
2024-01-15 18:30:00,"Push, lourd",1h 5m,Bench Press (Barbell),Rest Timer,0,0,0,90,,,
2024-01-12 07:00:00,Jambes,45m,Squat (Barbell),1,100,5,0,0,,,
`;

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Pull","8 Jan 2024, 07:31","8 Jan 2024, 08:40","","Pull Up","","","0","warmup","","5","","",""
"Pull","8 Jan 2024, 07:31","8 Jan 2024, 08:40","","Pull Up","","","1","normal","10","8","","",""
"Pull","8 Jan 2024, 07:31","8 Jan 2024, 08:40","","Curl marteau","","","0","normal","14","12","","",""
`;

describe("CSV", () => {
  it("lit les guillemets, les guillemets doublés et les retours à la ligne", () => {
    expect(parseCsv('a,"b,c","d ""e""\nf"\r\n1,2,3')).toEqual([
      ["a", "b,c", 'd "e"\nf'],
      ["1", "2", "3"],
    ]);
    expect(parseCsv("a;b\n1;2", ";")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("lit les dates des deux apps et refuse les dates impossibles", () => {
    expect(parseLocalDateTime("2024-01-15 18:30:00")).toEqual({ date: "2024-01-15", time: "18:30" });
    expect(parseLocalDateTime("8 Jan 2024, 07:31")).toEqual({ date: "2024-01-08", time: "07:31" });
    expect(parseLocalDateTime("15/01/2024 9:05")).toEqual({ date: "2024-01-15", time: "09:05" });
    expect(parseLocalDateTime("2024-01-15")).toEqual({ date: "2024-01-15", time: null });
    expect(parseLocalDateTime("2024-02-30 10:00")).toBeNull();
    expect(parseLocalDateTime("8 Foo 2024, 07:31")).toBeNull();
    expect(parseLocalDateTime("hier")).toBeNull();
  });

  it("lit les durées Strong", () => {
    expect(parseStrongDuration("1h 5m")).toBe(65);
    expect(parseStrongDuration("45m")).toBe(45);
    expect(parseStrongDuration("2h")).toBe(120);
    expect(parseStrongDuration("")).toBeNull();
  });
});

describe("export Strong", () => {
  const result = readStrengthCsv(STRONG)!;

  it("regroupe les séries par séance, de la plus ancienne à la plus récente", () => {
    expect(result.source).toBe("strong");
    expect(result.workouts.map((w) => [w.date, w.time, w.name, w.minutes])).toEqual([
      ["2024-01-12", "07:00", "Jambes", 45],
      ["2024-01-15", "18:30", "Push, lourd", 65],
    ]);
  });

  it("garde l'échauffement, les durées, et écarte le cardio et le minuteur", () => {
    const push = result.workouts[1];
    expect(push.exercises.map((e) => e.name)).toEqual(["Bench Press (Barbell)", "Plank"]);
    expect(push.exercises[0].sets).toEqual([
      { weightKg: 40, reps: 10, seconds: null, warmup: true },
      { weightKg: 80, reps: 5, seconds: null, warmup: false },
      { weightKg: 80, reps: 5, seconds: null, warmup: false },
    ]);
    expect(push.exercises[1].sets).toEqual([{ weightKg: null, reps: null, seconds: 60, warmup: false }]);
    expect(result.skipped).toBe(2);
  });

  it("liste les exercices du plus fréquent au moins fréquent", () => {
    expect(result.exercises).toEqual([
      { name: "Bench Press (Barbell)", sets: 3 },
      { name: "Plank", sets: 1 },
      { name: "Squat (Barbell)", sets: 1 },
    ]);
  });

  it("convertit les livres quand l'export est en lb", () => {
    const lb = readStrengthCsv(STRONG, "lb")!;
    expect(lb.workouts[0].exercises[0].sets[0].weightKg).toBe(45.36);
  });

  it("lit un export au point-virgule avec marque d'ordre d'octet", () => {
    const semi = "﻿" + STRONG.split("\n").map((l) => l.replace(/"([^"]*)"/g, (_, x: string) => x.replace(",", " ")).replaceAll(",", ";")).join("\n");
    const r = readStrengthCsv(semi)!;
    expect(r.workouts).toHaveLength(2);
    expect(r.workouts[1].name).toBe("Push  lourd");
  });
});

describe("export Hevy", () => {
  const result = readStrengthCsv(HEVY)!;

  it("lit les séances, l'échauffement et la durée", () => {
    expect(result.source).toBe("hevy");
    expect(result.workouts).toHaveLength(1);
    const w = result.workouts[0];
    expect([w.date, w.time, w.minutes]).toEqual(["2024-01-08", "07:31", 69]);
    expect(w.exercises[0].sets).toEqual([
      { weightKg: null, reps: 5, seconds: null, warmup: true },
      { weightKg: 10, reps: 8, seconds: null, warmup: false },
    ]);
  });

  it("convertit la colonne weight_lbs", () => {
    const lbs = readStrengthCsv(HEVY.replace("weight_kg", "weight_lbs"))!;
    expect(lbs.workouts[0].exercises[0].sets[1].weightKg).toBe(4.54);
  });
});

describe("garde-fous", () => {
  it("refuse un fichier qui n'est ni Strong ni Hevy", () => {
    expect(readStrengthCsv("a,b\n1,2")).toBeNull();
    expect(readStrengthCsv("")).toBeNull();
    expect(readStrengthCsv(STRONG.split("\n")[0])).toBeNull();
  });

  it("écarte les valeurs hors limites de la base", () => {
    const r = readStrengthCsv(`Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Seconds
2024-01-15 18:30:00,A,1h,Squat,1,2000,5,0
2024-01-15 18:30:00,A,1h,Squat,2,100,5,0`)!;
    expect(r.workouts[0].exercises[0].sets).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });

  it("ne garde pas plus de 50 séries par exercice", () => {
    const rows = Array.from({ length: 60 }, (_, i) => `2024-01-15 18:30:00,A,1h,Squat,${i + 1},100,5,0`);
    const r = readStrengthCsv(`Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Seconds\n${rows.join("\n")}`)!;
    expect(r.workouts[0].exercises[0].sets).toHaveLength(50);
    expect(r.skipped).toBe(10);
  });
});

describe("correspondance avec le catalogue", () => {
  const catalog = [
    { id: "1", slug: "developpe-couche-barre", name: "Développé couché" },
    { id: "2", slug: "curl-marteau", name: "Curl marteau" },
    { id: "3", slug: "tractions-pronation", name: "Tractions pronation" },
    { id: "4", slug: null, name: "Mon exercice" },
  ];

  it("reconnaît les noms anglais courants et les noms français", () => {
    expect(normalizeExerciseName("Bench Press (Barbell)")).toBe("bench press barbell");
    expect(suggestExercise("Bench Press (Barbell)", catalog)).toBe("1");
    expect(suggestExercise("Pull Up", catalog)).toBe("3");
    expect(suggestExercise("curl Marteau", catalog)).toBe("2");
    expect(suggestExercise("Développé  couché", catalog)).toBe("1");
    expect(suggestExercise("Mon exercice", catalog)).toBe("4");
  });

  it("ne propose rien pour un nom inconnu", () => {
    expect(suggestExercise("Zercher Squat", catalog)).toBeNull();
  });
});
