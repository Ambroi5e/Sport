import { CalendarCheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { ProgramView } from "@/components/training/program-view";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { e1rmHistory, isDeloadWeek, nextSessionIndex, plannedSetsPerMuscle, programWeek, projectE1RM } from "@/lib/engine";
import { programSuggestions, suggestionShort } from "@/lib/program";
import { startWorkout } from "../actions";
import { getCompletedSets } from "../data";
import { endProgram } from "./actions";
import { getActiveProgram } from "./data";

export const metadata: Metadata = { title: "Programme" };

export default async function ProgramPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const today = localDate(profile.timezone);
  const program = await getActiveProgram();

  if (!program) {
    return (
      <>
        <PageHeader back="/entrainement" title="Programme" />
        <div className="grid gap-4 md:max-w-2xl">
          <EmptyState icon={<CalendarCheckIcon size={22} />} title="Pas de programme en cours">
            Dis à Fonte combien de séances tu fais, combien de temps, avec quel matériel et ce que tu veux faire progresser : il te génère tes séances, te
            propose la charge du jour à chaque séance et te montre où tu en es face à ton objectif.
          </EmptyState>
          <Link href="/entrainement/programme/nouveau" className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
            Créer mon programme
          </Link>
        </div>
      </>
    );
  }

  const exerciseIds = [...new Set([...program.sessions.flatMap((s) => s.items.map((i) => i.exerciseId)), ...(program.goal_exercise_id ? [program.goal_exercise_id] : [])])];
  const history = await getCompletedSets(exerciseIds);
  const week = programWeek(program.starts_on, today);
  const nextIndex = nextSessionIndex(
    program.sessions.map((s) => s.id),
    program.lastDone?.template_id ?? null,
  );
  const next = program.sessions[nextIndex] ?? null;
  const suggested = next ? programSuggestions(history, next.items, program, today) : [];
  const goalHistory = program.goal_exercise_id ? (e1rmHistory(history.filter((s) => s.exerciseId === program.goal_exercise_id))[program.goal_exercise_id] ?? []) : [];

  const view = (s: (typeof program.sessions)[number]) => ({
    id: s.id,
    name: s.name,
    items: s.items.map((i) => ({ id: i.id, name: i.exercise.name, sets: i.sets, repMin: i.repMin, repMax: i.repMax })),
  });

  return (
    <>
      <PageHeader back="/entrainement" eyebrow="Programme" title={program.name} />
      <ProgramView
        unit={unit}
        startAction={startWorkout}
        endAction={endProgram.bind(null, program.id)}
        data={{
          id: program.id,
          name: program.name,
          startsOn: program.starts_on,
          weeks: program.weeks,
          deloadEvery: program.deload_every,
          sessionMinutes: program.session_minutes,
          equipment: program.equipment,
          priority: program.priority_muscles,
          week,
          deload: isDeloadWeek(week, program.deload_every),
          today,
          next: next
            ? {
                session: view(next),
                suggestions: Object.fromEntries(next.items.flatMap((i, k) => (suggested[k]?.suggestion ? [[i.id, suggestionShort(suggested[k]!.suggestion!, unit)]] : []))),
              }
            : null,
          sessions: program.sessions.map(view),
          planned: plannedSetsPerMuscle(
            program.sessions,
            program.sessions.flatMap((s) => s.items.map((i) => ({ id: i.exerciseId, name: i.exercise.name, equipment: i.exercise.equipment, measure: i.exercise.measure, primary: i.exercise.primary_muscles, secondary: i.exercise.secondary_muscles }))),
          ),
          goal:
            program.goal && program.goalKg !== null
              ? {
                  exerciseName: program.goal.name,
                  kg: program.goalKg,
                  date: program.goal_date,
                  history: goalHistory,
                  projection: projectE1RM({ history: goalHistory, today, targetKg: program.goalKg, level: profile.level, startsOn: program.starts_on, deloadEvery: program.deload_every }),
                }
              : null,
        }}
      />
    </>
  );
}
