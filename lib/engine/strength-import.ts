/**
 * Import d'un historique de musculation exporté par Strong ou Hevy (CSV), lu sur
 * l'appareil. Pur : aucun import de React, Next ou Supabase.
 */

export type StrengthSource = "strong" | "hevy";

export type ImportedSet = { weightKg: number | null; reps: number | null; seconds: number | null; warmup: boolean };
export type ImportedExercise = { name: string; sets: ImportedSet[] };
export type ImportedWorkout = {
  name: string;
  /** Jour de la séance, tel qu'écrit dans le fichier (AAAA-MM-JJ). */
  date: string;
  /** Heure locale de début (HH:MM), si le fichier la donne. */
  time: string | null;
  minutes: number | null;
  exercises: ImportedExercise[];
};
export type StrengthImport = {
  source: StrengthSource;
  workouts: ImportedWorkout[];
  /** Noms d'exercice rencontrés, avec leur nombre de séries, du plus fréquent au moins fréquent. */
  exercises: { name: string; sets: number }[];
  /** Lignes écartées : cardio (avec une distance), minuteur de repos, valeurs illisibles ou hors limites. */
  skipped: number;
};

export const STRENGTH_MAX_BYTES = 20 * 1024 * 1024;
export const IMPORT_MAX_SETS = 50;
export const IMPORT_MAX_EXERCISES = 99;
/** Séances envoyées par appel : reste sous la limite de taille d'une Server Action. */
export const IMPORT_BATCH = 50;
const LB = 0.45359237;

/** Découpe un CSV (guillemets doublés, retours à la ligne entre guillemets). */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

function delimiterOf(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/** Date et heure locales : « 2024-01-15 18:30:00 », « 15/01/2024 18:30 » ou « 15 Jan 2024, 18:30 ». */
export function parseLocalDateTime(raw: string): { date: string; time: string | null } | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let rest: string;
  let match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s);
  if (match) [y, m, d, rest] = [Number(match[1]), Number(match[2]), Number(match[3]), match[4]];
  else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/.exec(s))) [d, m, y, rest] = [Number(match[1]), Number(match[2]), Number(match[3]), match[4]];
  else if ((match = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})(.*)$/.exec(s))) {
    const month = MONTHS[match[2].toLowerCase()];
    if (!month) return null;
    [d, m, y, rest] = [Number(match[1]), month, Number(match[3]), match[4]];
  } else return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  const t = /(\d{1,2}):(\d{2})/.exec(rest);
  const time = t && Number(t[1]) < 24 && Number(t[2]) < 60 ? `${pad(Number(t[1]))}:${t[2]}` : null;
  return { date: `${y}-${pad(m)}-${pad(d)}`, time };
}

/** Durée Strong : « 1h 5m », « 45m », « 30s ». */
export function parseStrongDuration(raw: string | undefined): number | null {
  if (!raw) return null;
  let seconds = 0;
  let found = false;
  for (const [, value, unit] of raw.matchAll(/(\d+)\s*([hms])/g)) {
    found = true;
    seconds += Number(value) * (unit === "h" ? 3600 : unit === "m" ? 60 : 1);
  }
  return found && seconds > 0 ? Math.round(seconds / 60) : null;
}

function minutesBetween(a: { date: string; time: string | null }, b: { date: string; time: string | null } | null): number | null {
  if (!b || !a.time || !b.time) return null;
  const at = (x: { date: string; time: string | null }) => Date.parse(`${x.date}T${x.time}:00Z`);
  const minutes = Math.round((at(b) - at(a)) / 60000);
  return minutes > 0 && minutes <= 24 * 60 ? minutes : null;
}

function cleanSet(weight: number | null, reps: number | null, seconds: number | null, warmup: boolean, toKg: number): ImportedSet | null {
  const kg = weight === null || weight <= 0 ? null : Math.round(weight * toKg * 100) / 100;
  const r = reps === null || reps <= 0 ? null : Math.round(reps);
  const s = seconds === null || seconds <= 0 ? null : Math.round(seconds);
  if (r === null && s === null) return null;
  if ((kg !== null && kg > 1000) || (r !== null && r > 1000) || (s !== null && s > 86400)) return null;
  return { weightKg: kg, reps: r, seconds: r === null ? s : null, warmup };
}

type Row = { key: string; name: string; when: { date: string; time: string | null }; minutes: number | null; exercise: string; set: ImportedSet };

/**
 * Lit un export Strong ou Hevy. `strongUnit` : unité des charges d'un export Strong,
 * qui ne l'écrit pas. Renvoie null si le fichier n'est ni l'un ni l'autre.
 */
export function readStrengthCsv(text: string, strongUnit: "kg" | "lb" = "kg"): StrengthImport | null {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.slice(0, clean.search(/\r?\n/) === -1 ? undefined : clean.search(/\r?\n/));
  const table = parseCsv(clean, delimiterOf(firstLine));
  if (table.length < 2) return null;
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  let source: StrengthSource;
  let read: (cells: string[]) => Row | null | "skip";
  if (col("exercise name") >= 0 && col("date") >= 0 && col("set order") >= 0) {
    source = "strong";
    const [cDate, cName, cDur, cEx, cOrder, cW, cR, cS, cDist] = ["date", "workout name", "duration", "exercise name", "set order", "weight", "reps", "seconds", "distance"].map(col);
    const toKg = strongUnit === "lb" ? LB : 1;
    read = (cells) => {
      const when = parseLocalDateTime(cells[cDate] ?? "");
      const exercise = (cells[cEx] ?? "").trim();
      const order = (cells[cOrder] ?? "").trim();
      if (!when || !exercise) return null;
      if (!/^(\d+|[WDF])$/i.test(order) || (num(cells[cDist]) ?? 0) > 0) return "skip";
      const set = cleanSet(num(cells[cW]), num(cells[cR]), cS >= 0 ? num(cells[cS]) : null, order.toUpperCase() === "W", toKg);
      if (!set) return "skip";
      const name = (cells[cName] ?? "").trim() || "Séance importée";
      return { key: `${when.date} ${when.time} ${name}`, name, when, minutes: parseStrongDuration(cells[cDur]), exercise, set };
    };
  } else if (col("exercise_title") >= 0 && col("start_time") >= 0) {
    source = "hevy";
    const [cTitle, cStart, cEnd, cEx, cType, cR, cS, cDist] = ["title", "start_time", "end_time", "exercise_title", "set_type", "reps", "duration_seconds", "distance_km"].map(col);
    const cKg = col("weight_kg");
    const cLb = col("weight_lbs");
    read = (cells) => {
      const when = parseLocalDateTime(cells[cStart] ?? "");
      const exercise = (cells[cEx] ?? "").trim();
      if (!when || !exercise) return null;
      if ((num(cells[cDist]) ?? 0) > 0) return "skip";
      const weight = cKg >= 0 ? num(cells[cKg]) : cLb >= 0 ? num(cells[cLb]) : null;
      const set = cleanSet(weight, num(cells[cR]), cS >= 0 ? num(cells[cS]) : null, (cells[cType] ?? "").trim().toLowerCase() === "warmup", cKg >= 0 ? 1 : LB);
      if (!set) return "skip";
      const end = cEnd >= 0 ? parseLocalDateTime(cells[cEnd] ?? "") : null;
      const name = (cells[cTitle] ?? "").trim() || "Séance importée";
      return { key: `${cells[cStart]} ${name}`, name, when, minutes: minutesBetween(when, end), exercise, set };
    };
  } else return null;

  const byKey = new Map<string, ImportedWorkout>();
  const counts = new Map<string, number>();
  let skipped = 0;
  for (const cells of table.slice(1)) {
    const row = read(cells);
    if (row === null || row === "skip") {
      skipped++;
      continue;
    }
    let workout = byKey.get(row.key);
    if (!workout) {
      workout = { name: row.name.slice(0, 60), date: row.when.date, time: row.when.time, minutes: row.minutes, exercises: [] };
      byKey.set(row.key, workout);
    }
    let exercise = workout.exercises.find((e) => e.name === row.exercise);
    if (!exercise) {
      if (workout.exercises.length >= IMPORT_MAX_EXERCISES) {
        skipped++;
        continue;
      }
      exercise = { name: row.exercise, sets: [] };
      workout.exercises.push(exercise);
    }
    if (exercise.sets.length >= IMPORT_MAX_SETS) {
      skipped++;
      continue;
    }
    exercise.sets.push(row.set);
    counts.set(row.exercise, (counts.get(row.exercise) ?? 0) + 1);
  }
  const workouts = [...byKey.values()].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  if (workouts.length === 0) return null;
  const exercises = [...counts].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
  return { source, workouts, exercises, skipped };
}

/** Minuscules, sans accents ni ponctuation. */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Noms courants de Strong et Hevy (anglais), normalisés, vers les exercices du catalogue. */
const KNOWN: Record<string, string> = {
  "bench press barbell": "developpe-couche-barre",
  "bench press dumbbell": "developpe-couche-halteres",
  "incline bench press barbell": "developpe-incline-barre",
  "incline bench press dumbbell": "developpe-incline-halteres",
  "decline bench press barbell": "developpe-decline",
  "close grip bench press barbell": "developpe-couche-serre",
  "bench press close grip barbell": "developpe-couche-serre",
  "chest fly dumbbell": "ecarte-halteres",
  "cable crossover": "ecarte-poulie",
  "cable fly crossovers": "ecarte-poulie",
  "chest fly machine": "pec-deck",
  "butterfly pec deck": "pec-deck",
  "chest press machine": "presse-pectoraux",
  "chest dip": "dips",
  "dip": "dips",
  "triceps dip": "dips",
  "bench dip": "dips-banc",
  "push up": "pompes",
  "pull up": "tractions-pronation",
  "chin up": "tractions-supination",
  "lat pulldown cable": "tirage-vertical",
  "lat pulldown machine": "tirage-vertical",
  "lat pulldown close grip cable": "tirage-vertical-serre",
  "bent over row barbell": "rowing-barre",
  "bent over one arm row dumbbell": "rowing-haltere",
  "dumbbell row": "rowing-haltere",
  "seated row cable": "tirage-horizontal",
  "seated cable row v grip cable": "tirage-horizontal",
  "seated row machine": "rowing-machine",
  "pullover cable": "pullover-poulie",
  "straight arm lat pulldown cable": "pullover-poulie",
  "deadlift barbell": "souleve-de-terre",
  "romanian deadlift barbell": "souleve-de-terre-roumain",
  "shrug dumbbell": "shrugs-halteres",
  "back extension": "extensions-lombaires",
  "back extension hyperextension": "extensions-lombaires",
  "overhead press barbell": "developpe-militaire",
  "strict military press barbell": "developpe-militaire",
  "shoulder press dumbbell": "developpe-halteres-assis",
  "seated overhead press dumbbell": "developpe-halteres-assis",
  "lateral raise dumbbell": "elevations-laterales",
  "lateral raise cable": "elevations-laterales-poulie",
  "lateral raise machine": "elevations-laterales-machine",
  "reverse fly dumbbell": "oiseau-halteres",
  "rear delt reverse fly dumbbell": "oiseau-halteres",
  "face pull cable": "face-pull",
  "face pull": "face-pull",
  "reverse fly machine": "pec-deck-inverse",
  "rear delt reverse fly machine": "pec-deck-inverse",
  "front raise dumbbell": "elevations-frontales",
  "upright row barbell": "rowing-menton",
  "bicep curl barbell": "curl-barre",
  "bicep curl dumbbell": "curl-halteres",
  "hammer curl dumbbell": "curl-marteau",
  "incline curl dumbbell": "curl-incline",
  "preacher curl barbell": "curl-pupitre",
  "bicep curl cable": "curl-poulie",
  "triceps pushdown cable straight bar": "extension-triceps-poulie",
  "triceps pushdown": "extension-triceps-poulie",
  "triceps rope pushdown": "extension-triceps-corde",
  "triceps pushdown cable rope": "extension-triceps-corde",
  "skullcrusher barbell": "barre-front",
  "triceps extension dumbbell": "extension-nuque-haltere",
  "overhead triceps extension dumbbell": "extension-nuque-haltere",
  "squat barbell": "squat",
  "full squat": "squat",
  "front squat barbell": "squat-avant",
  "goblet squat kettlebell": "goblet-squat",
  "goblet squat dumbbell": "goblet-squat",
  "leg press": "presse-cuisses",
  "leg press machine": "presse-cuisses",
  "hack squat": "hack-squat",
  "hack squat machine": "hack-squat",
  "lunge dumbbell": "fentes-halteres",
  "walking lunge dumbbell": "fentes-halteres",
  "bulgarian split squat": "squat-bulgare",
  "bulgarian split squat dumbbell": "squat-bulgare",
  "leg extension machine": "leg-extension",
  "lying leg curl machine": "leg-curl-allonge",
  "seated leg curl machine": "leg-curl-assis",
  "hip thrust barbell": "hip-thrust",
  "hip adduction machine": "adducteurs-machine",
  "hip abduction machine": "abducteurs-machine",
  "standing calf raise machine": "mollets-debout",
  "seated calf raise machine": "mollets-assis",
  "kettlebell swing": "kettlebell-swing",
  "crunch": "crunch",
  "cable crunch": "crunch-poulie",
  "hanging leg raise": "releve-jambes-suspendu",
  "plank": "gainage",
  "side plank": "gainage-lateral",
  "ab wheel": "roue-abdominale",
  "russian twist": "russian-twist",
  "wrist curl barbell": "curl-poignets",
  "farmers walk": "marche-du-fermier",
};

/** Exercice du catalogue proposé pour un nom importé, ou null. */
export function suggestExercise(name: string, catalog: readonly { id: string; slug: string | null; name: string }[]): string | null {
  const key = normalizeExerciseName(name);
  const byName = catalog.find((e) => normalizeExerciseName(e.name) === key);
  if (byName) return byName.id;
  const slug = KNOWN[key];
  return slug ? (catalog.find((e) => e.slug === slug)?.id ?? null) : null;
}
