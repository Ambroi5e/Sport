/**
 * Planning de la semaine : les séances du programme placées jour par jour selon
 * les jours disponibles, la récupération des muscles, les sports prévus et les
 * changements faits à la main ; puis l'adaptation de la séance du jour à la forme
 * et à la charge récente. Des règles explicables, sans hasard : le même historique
 * donne le même planning.
 */

import type { Intensity } from "./activity";
import { isoWeekday } from "./nutrition";
import { readiness, type Checkin, type CheckinField, type ReadinessLevel } from "./readiness";

const DAY_MS = 86_400_000;

function dayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function shift(date: string, days: number): string {
  return new Date((dayIndex(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

// Muscles -------------------------------------------------------------------------

/** Petits muscles qui récupèrent en un jour : ils ne séparent pas deux séances. */
export const QUICK_RECOVERY: ReadonlySet<string> = new Set(["abdominaux", "obliques", "mollets", "avant_bras"]);

const LEGS = ["quadriceps", "ischios", "fessiers", "adducteurs"];

/**
 * Muscles qu'un sport fatigue au point de gêner une séance proche : les jambes
 * pour les sports de raquette, collectifs et de combat ; le dos et les biceps pour
 * l'escalade. « Autre » : rien, on ne devine pas.
 */
export const SPORT_MUSCLES: Readonly<Record<string, readonly string[]>> = {
  padel: LEGS,
  tennis: LEGS,
  squash: LEGS,
  badminton: LEGS,
  foot: LEGS,
  basket: LEGS,
  handball: LEGS,
  rugby: LEGS,
  volley: LEGS,
  combat: LEGS,
  escalade: ["dorsaux", "biceps"],
  autre: [],
};

/** Gros muscles d'une séance : les muscles principaux de ses exercices, sans ceux qui récupèrent vite. */
export function recoveryMuscles(primaries: readonly (readonly string[])[]): string[] {
  return [...new Set(primaries.flat())].filter((m) => !QUICK_RECOVERY.has(m)).sort();
}

// Planning ------------------------------------------------------------------------

export type PlanSession = { id: string; name: string; muscles: readonly string[] };
export type PlanWorkout = { date: string; templateId: string | null; name: string; muscles: readonly string[]; isLight?: boolean };
export type PlanActivity = { date: string; sport: string; label: string | null; minutes: number; intensity: Intensity };
export type WeeklySport = { weekday: number; sport: string; label: string | null; minutes: number; intensity: Intensity };
export type PlanPin = { templateId: string; date: string };

export type PlanInput = {
  today: string;
  /** Séances du programme, dans l'ordre. */
  sessions: readonly PlanSession[];
  /** Dernière séance du programme terminée avant le lundi de la semaine. */
  lastDoneBeforeWeek: string | null;
  /** Jours disponibles, 1 = lundi … 7 = dimanche ; vide : tous les jours. */
  availableDays: readonly number[];
  /** Séances terminées, de la veille du lundi à aujourd'hui (au moins). */
  workouts: readonly PlanWorkout[];
  /** Sports notés. */
  activities: readonly PlanActivity[];
  /** Sports fixes de la semaine type. */
  weeklySports: readonly WeeklySport[];
  /** Séances posées à la main sur un jour de cette semaine. */
  pins: readonly PlanPin[];
  /** Jours de cette semaine où l'on n'est pas disponible (repos ajouté, séance décalée). */
  blocked: readonly string[];
};

/**
 * Ce qui gêne une séance : une séance ou un sport, la veille (`offset` −1), le
 * jour même (0) ou le lendemain (1), qui travaille les mêmes muscles.
 */
export type Conflict = { date: string; offset: number; kind: "seance" | "sport"; name: string; sport: string | null; label: string | null; muscles: string[] };

export type DaySport = PlanActivity & { done: boolean };

export type PlannedSession = PlanSession & { pinned: boolean; conflicts: Conflict[] };

export type PlanDay = {
  date: string;
  weekday: number;
  isToday: boolean;
  isPast: boolean;
  /** Jour disponible d'après la semaine type. */
  available: boolean;
  /** Retiré à la main pour cette semaine. */
  blocked: boolean;
  workouts: { name: string; templateId: string | null; isLight: boolean }[];
  sports: DaySport[];
  session: PlannedSession | null;
  /** Séance prévue ce jour-là dans le planning de lundi, et pas faite. */
  missed: PlanSession | null;
};

export type WeekPlan = {
  start: string;
  days: PlanDay[];
  /** Séances qui restent à faire cette semaine, dans l'ordre du programme. */
  remaining: PlanSession[];
  /** Séances qui ne tiennent plus d'ici dimanche. */
  unplaced: PlanSession[];
  /** Séances du programme faites cette semaine. */
  done: number;
};

type Fatigue = { date: string; muscles: readonly string[]; kind: "seance" | "sport"; name: string; sport: string | null; label: string | null; id?: string };

/** Ordre des séances de la semaine : celle qui suit la dernière faite, puis les autres dans l'ordre. */
function weekOrder(sessions: readonly PlanSession[], lastDone: string | null): PlanSession[] {
  const i = lastDone ? sessions.findIndex((s) => s.id === lastDone) : -1;
  return sessions.map((_, k) => sessions[(i + 1 + k) % sessions.length]);
}

/** Sports d'un jour : ceux notés ; aujourd'hui et après, aussi les sports fixes pas encore notés. */
function sportsOn(date: string, input: PlanInput): DaySport[] {
  const done = input.activities.filter((a) => a.date === date).map((a) => ({ ...a, done: true }));
  if (date < input.today) return done;
  const planned = input.weeklySports
    .filter((w) => w.weekday === isoWeekday(date) && !done.some((a) => a.sport === w.sport))
    .map((w) => ({ date, sport: w.sport, label: w.label, minutes: w.minutes, intensity: w.intensity, done: false }));
  return [...done, ...planned];
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

function shared(a: readonly string[], b: readonly string[]): string[] {
  return a.filter((m) => b.includes(m));
}

function conflictsWith(session: PlanSession, date: string, items: readonly Fatigue[]): Conflict[] {
  const day = dayIndex(date);
  return items.flatMap((it) => {
    const offset = dayIndex(it.date) - day;
    if (Math.abs(offset) > 1 || it.id === session.id) return [];
    const muscles = shared(session.muscles, it.muscles);
    return muscles.length ? [{ date: it.date, offset, kind: it.kind, name: it.name, sport: it.sport, label: it.label, muscles }] : [];
  });
}

/** Placement de la semaine, sans les séances ratées. */
export function placeWeek(input: PlanInput): WeekPlan {
  const { today } = input;
  const start = shift(today, 1 - isoWeekday(today));
  const end = shift(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => shift(start, i));
  const blocked = new Set(input.blocked);
  const programIds = new Set(input.sessions.map((s) => s.id));

  // Séances de la semaine : l'ordre du programme, moins celles déjà faites cette semaine.
  const doneThisWeek = input.workouts.filter((w) => w.date >= start && w.date <= today && w.templateId !== null && programIds.has(w.templateId));
  const doneIds = new Set(doneThisWeek.map((w) => w.templateId));
  const quota = Math.max(0, input.sessions.length - doneThisWeek.length);
  const remaining = weekOrder(input.sessions, input.lastDoneBeforeWeek)
    .filter((s) => !doneIds.has(s.id))
    .slice(0, quota);
  const remainingIds = new Set(remaining.map((s) => s.id));
  const workedOn = new Set(input.workouts.map((w) => w.date));

  // Déplacements à la main encore valables : à venir, sur un jour libre, pour une séance qui reste.
  const pinned = new Map<string, string>();
  const pinnedDays = new Set<string>();
  for (const pin of input.pins) {
    if (!remainingIds.has(pin.templateId) || pinned.has(pin.templateId)) continue;
    if (pin.date < today || pin.date > end || blocked.has(pin.date) || workedOn.has(pin.date) || pinnedDays.has(pin.date)) continue;
    pinned.set(pin.templateId, pin.date);
    pinnedDays.add(pin.date);
  }

  const daySports = new Map([shift(start, -1), ...dates].map((d) => [d, sportsOn(d, input)]));
  const fixed: Fatigue[] = [
    ...input.workouts.map((w) => ({ date: w.date, muscles: w.muscles, kind: "seance" as const, name: w.name, sport: null, label: null })),
    ...[...daySports.values()].flatMap((list) =>
      list
        .filter((s) => s.intensity !== "legere")
        .map((s) => ({ date: s.date, muscles: SPORT_MUSCLES[s.sport] ?? [], kind: "sport" as const, name: s.label ?? s.sport, sport: s.sport, label: s.label })),
    ),
    ...remaining
      .filter((s) => pinned.has(s.id))
      .map((s) => ({ date: pinned.get(s.id)!, muscles: s.muscles, kind: "seance" as const, name: s.name, sport: null, label: null, id: s.id })),
  ];

  const isAvailable = (date: string) => input.availableDays.length === 0 || input.availableDays.includes(isoWeekday(date));
  const candidates = dates.filter((d) => d >= today && isAvailable(d) && !blocked.has(d) && !workedOn.has(d) && !pinnedDays.has(d));
  const free = remaining.filter((s) => !pinned.has(s.id));
  const rank = new Map(remaining.map((s, i) => [s.id, i]));
  const target = Math.min(free.length, candidates.length);
  const busy = new Set([...input.workouts.filter((w) => w.date >= start).map((w) => w.date), ...pinnedDays]);

  // Recherche exhaustive (au plus 6 séances sur 7 jours) : le moins de conflits, puis l'ordre
  // du programme, puis des séances espacées, puis le plus tôt.
  const assign: (PlanSession | null)[] = candidates.map(() => null);
  const used = new Set<string>();
  const found: { cost: number[] | null; assign: (PlanSession | null)[] } = { cost: null, assign: [...assign] };

  const evaluate = (violations: number) => {
    const at = new Map<string, number>();
    assign.forEach((s, i) => s && at.set(s.id, dayIndex(candidates[i])));
    let inversions = 0;
    for (const a of free)
      for (const b of free) if (rank.get(a.id)! < rank.get(b.id)! && (at.get(a.id) ?? Infinity) > (at.get(b.id) ?? Infinity)) inversions++;
    const days = new Set([...busy, ...candidates.filter((_, i) => assign[i])]);
    const backToBack = dates.filter((d, i) => i < 6 && days.has(d) && days.has(dates[i + 1])).length;
    const early = [...at.values()].reduce((sum, d) => sum + d - dayIndex(start), 0);
    const cost = [violations, inversions, backToBack, early];
    if (!found.cost || lexLess(cost, found.cost)) Object.assign(found, { cost, assign: [...assign] });
  };

  const search = (i: number, placed: number, violations: number) => {
    if (found.cost && violations > found.cost[0]) return;
    if (placed === target) return evaluate(violations);
    if (candidates.length - i < target - placed) return;
    const date = candidates[i];
    const earlier: Fatigue[] = assign.flatMap((s, k) => (s && k < i ? [{ date: candidates[k], muscles: s.muscles, kind: "seance" as const, name: s.name, sport: null, label: null }] : []));
    // Deux séances aux mêmes muscles sont interchangeables : on n'essaie que la première dans l'ordre.
    const tried = new Set<string>();
    for (const s of free) {
      const key = s.muscles.join(",");
      if (used.has(s.id) || tried.has(key)) continue;
      tried.add(key);
      const v = conflictsWith(s, date, fixed).length + conflictsWith(s, date, earlier).length;
      assign[i] = s;
      used.add(s.id);
      search(i + 1, placed + 1, violations + v);
      assign[i] = null;
      used.delete(s.id);
    }
    search(i + 1, placed, violations);
  };
  search(0, 0, 0);

  const planned = new Map<string, { session: PlanSession; pinned: boolean }>();
  for (const s of remaining) if (pinned.has(s.id)) planned.set(pinned.get(s.id)!, { session: s, pinned: true });
  found.assign.forEach((s, i) => s && planned.set(candidates[i], { session: s, pinned: false }));
  const placedIds = new Set([...planned.values()].map((p) => p.session.id));
  const all: Fatigue[] = [
    ...fixed.filter((f) => f.id === undefined),
    ...[...planned].map(([date, p]) => ({ date, muscles: p.session.muscles, kind: "seance" as const, name: p.session.name, sport: null, label: null, id: p.session.id })),
  ];

  return {
    start,
    remaining,
    unplaced: remaining.filter((s) => !placedIds.has(s.id)),
    done: doneThisWeek.length,
    days: dates.map((date) => {
      const p = planned.get(date);
      return {
        date,
        weekday: isoWeekday(date),
        isToday: date === today,
        isPast: date < today,
        available: isAvailable(date),
        blocked: blocked.has(date),
        workouts: input.workouts.filter((w) => w.date === date).map((w) => ({ name: w.name, templateId: w.templateId, isLight: w.isLight ?? false })),
        sports: daySports.get(date)!,
        session: p ? { ...p.session, pinned: p.pinned, conflicts: conflictsWith(p.session, date, all) } : null,
        missed: null,
      };
    }),
  };
}

/**
 * Planning de la semaine, avec les séances ratées : le planning tel qu'il était
 * lundi matin dit ce qui était prévu les jours passés ; une séance prévue un jour
 * passé et pas faite cette semaine est signalée sur ce jour.
 */
export function planWeek(input: PlanInput): WeekPlan {
  const plan = placeWeek(input);
  if (input.today === plan.start) return plan;
  const before = (d: string) => d < plan.start;
  const original = placeWeek({
    ...input,
    today: plan.start,
    workouts: input.workouts.filter((w) => before(w.date)),
    activities: input.activities.filter((a) => before(a.date)),
  });
  const programIds = new Set(input.sessions.map((s) => s.id));
  const doneIds = new Set(input.workouts.filter((w) => !before(w.date) && w.templateId && programIds.has(w.templateId)).map((w) => w.templateId));
  plan.days.forEach((day, i) => {
    const was = original.days[i].session;
    if (day.isPast && was && !doneIds.has(was.id)) day.missed = { id: was.id, name: was.name, muscles: was.muscles };
  });
  return plan;
}

/** Prochaine séance prévue, aujourd'hui ou après. */
export function nextPlanned(plan: WeekPlan): { date: string; session: PlannedSession } | null {
  const day = plan.days.find((d) => !d.isPast && d.session);
  return day ? { date: day.date, session: day.session! } : null;
}

/** Jour où irait la séance si aujourd'hui devenait un jour de repos, ou null si elle ne tient plus. */
export function postponeTarget(input: PlanInput, sessionId: string): string | null {
  const plan = placeWeek({ ...input, blocked: [...input.blocked, input.today], pins: input.pins.filter((p) => p.templateId !== sessionId) });
  return plan.days.find((d) => d.session?.id === sessionId)?.date ?? null;
}

/**
 * Séance qui peut remplacer celle du jour : une autre séance de la semaine, sur
 * d'autres gros muscles, sans conflit aujourd'hui. La première dans l'ordre.
 */
export function replacementFor(input: PlanInput, sessionId: string): PlanSession | null {
  const plan = placeWeek(input);
  const current = plan.remaining.find((s) => s.id === sessionId);
  if (!current) return null;
  for (const other of plan.remaining) {
    if (other.id === current.id || shared(other.muscles, current.muscles).length > 0) continue;
    const test = placeWeek({ ...input, pins: [...input.pins.filter((p) => p.templateId !== other.id && p.date !== input.today), { templateId: other.id, date: input.today }] });
    const today = test.days.find((d) => d.isToday)?.session;
    if (today?.id === other.id && today.conflicts.length === 0) return other;
  }
  return null;
}

/** Ce qu'impliquerait de poser la séance sur chacun des jours qui restent. */
export function moveOptions(
  input: PlanInput,
  sessionId: string,
): { date: string; available: boolean; blocked: boolean; taken: string | null; conflicts: Conflict[]; current: boolean }[] {
  const plan = placeWeek(input);
  const session = plan.remaining.find((s) => s.id === sessionId);
  if (!session) return [];
  const others = input.pins.filter((p) => p.templateId !== sessionId);
  return plan.days
    .filter((d) => !d.isPast)
    .map((day) => {
      // Jour déjà pris : une séance faite, ou une autre séance posée à la main.
      const pinnedHere = day.session && day.session.pinned && day.session.id !== sessionId ? day.session.name : null;
      const taken = day.workouts[0]?.name ?? pinnedHere;
      const conflicts =
        taken || day.blocked
          ? []
          : (placeWeek({ ...input, pins: [...others, { templateId: sessionId, date: day.date }] }).days.find((d) => d.date === day.date)?.session?.conflicts ?? []);
      return { date: day.date, available: day.available, blocked: day.blocked, taken, conflicts, current: day.session?.id === sessionId };
    });
}

// Charge récente --------------------------------------------------------------------

/** Effort sur 10 d'un sport selon son intensité (échelle de Borg CR10 : léger 3, modéré 5, intense 7). */
export const SPORT_EFFORT: Readonly<Record<Intensity, number>> = { legere: 3, moderee: 5, intense: 7 };
/** Effort sur 10 d'une séance de musculation. */
export const STRENGTH_EFFORT = 6;

/** Durée retenue pour une séance de musculation : réelle, entre 20 et 150 min ; 60 min sans heure de fin. */
export function workoutMinutes(startedAt: string, endedAt: string | null): number {
  if (!endedAt) return 60;
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  return Number.isFinite(minutes) ? Math.min(150, Math.max(20, minutes)) : 60;
}

export type LoadEntry = { date: string; minutes: number; effort: number };
export type TrainingLoad = { acute: number; chronic: number; ratio: number | null };

/**
 * Charge des 7 derniers jours (minutes × effort) face à la moyenne hebdomadaire
 * des 28 derniers : le rapport aigu/chronique. `ratio` est null avant 3 semaines
 * d'historique ou sans aucune charge.
 */
export function trainingLoad(entries: readonly LoadEntry[], today: string): TrainingLoad {
  const t = dayIndex(today);
  const recent = entries.filter((e) => t - dayIndex(e.date) >= 0 && t - dayIndex(e.date) < 28);
  const sum = (list: readonly LoadEntry[]) => list.reduce((s, e) => s + e.minutes * e.effort, 0);
  const acute = sum(recent.filter((e) => t - dayIndex(e.date) < 7));
  const chronic = sum(recent) / 4;
  const oldest = recent.reduce((max, e) => Math.max(max, t - dayIndex(e.date)), -1);
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio: oldest >= 21 && chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null };
}

export type LoadTrend = "baisse" | "habituelle" | "hausse" | "forte-hausse";

/** En hausse à 1,3 fois l'habitude, en forte hausse à 1,5 fois, en baisse sous 0,8. */
export function loadTrend(ratio: number): LoadTrend {
  return ratio >= 1.5 ? "forte-hausse" : ratio >= 1.3 ? "hausse" : ratio < 0.8 ? "baisse" : "habituelle";
}

// Adaptation à la forme -------------------------------------------------------------

export type Adaptation = "normal" | "alleger" | "decaler" | "remplacer";
export type AdaptReason = "forme" | "charge" | "courbatures";

/**
 * Ce que Fonte conseille pour la séance du jour. Bonne forme : la séance prévue,
 * allégée si la charge est en forte hausse. Forme moyenne : remplacée si les
 * courbatures pèsent et qu'une séance sur d'autres muscles peut prendre sa place,
 * allégée si les courbatures pèsent ou si la charge monte, sinon telle quelle.
 * Forme basse : remplacée (même condition), sinon décalée, sinon allégée.
 */
export function adaptSession(p: {
  level: ReadinessLevel;
  factors: readonly CheckinField[];
  loadRatio: number | null;
  canPostpone: boolean;
  canReplace: boolean;
}): { action: Adaptation; reason: AdaptReason } {
  const sore = p.factors.includes("soreness");
  const trend = p.loadRatio === null ? "habituelle" : loadTrend(p.loadRatio);
  if (p.level === "bonne") return trend === "forte-hausse" ? { action: "alleger", reason: "charge" } : { action: "normal", reason: "forme" };
  if (sore && p.canReplace) return { action: "remplacer", reason: "courbatures" };
  if (p.level === "moyenne") {
    if (sore) return { action: "alleger", reason: "courbatures" };
    if (trend === "hausse" || trend === "forte-hausse") return { action: "alleger", reason: "charge" };
    return { action: "normal", reason: "forme" };
  }
  if (p.canPostpone) return { action: "decaler", reason: "forme" };
  return { action: "alleger", reason: sore ? "courbatures" : "forme" };
}

export type TodayOptions = {
  session: PlannedSession;
  /** Jour où irait la séance si on la décale, ou null. */
  postponeTo: string | null;
  /** Séance qui peut prendre sa place aujourd'hui, ou null. */
  replacement: PlanSession | null;
  readiness: ReturnType<typeof readiness> | null;
  /** Conseil du jour ; null tant que le check-in n'est pas fait. */
  advice: { action: Adaptation; reason: AdaptReason } | null;
};

/** La séance prévue aujourd'hui, ce qu'on peut en faire et ce que Fonte conseille. `null` sans séance prévue. */
export function todayOptions(input: PlanInput, plan: WeekPlan, checkin: Checkin | null, loadRatio: number | null): TodayOptions | null {
  const session = plan.days.find((d) => d.isToday)?.session ?? null;
  if (!session) return null;
  const postponeTo = postponeTarget(input, session.id);
  const replacement = replacementFor(input, session.id);
  const r = checkin ? readiness(checkin) : null;
  const advice = r ? adaptSession({ level: r.level, factors: r.factors, loadRatio, canPostpone: postponeTo !== null, canReplace: replacement !== null }) : null;
  return { session, postponeTo, replacement, readiness: r, advice };
}
