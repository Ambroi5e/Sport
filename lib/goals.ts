import type { Enums } from "@/lib/supabase/database.types";

export type GoalType = Enums<"goal_type">;

export const GOAL_GROUPS: { label: string; goals: { value: GoalType; label: string }[] }[] = [
  {
    label: "Esthétique",
    goals: [
      { value: "prise_de_masse", label: "Prise de masse" },
      { value: "seche", label: "Sèche" },
      { value: "recomposition", label: "Recomposition" },
    ],
  },
  { label: "Force", goals: [{ value: "force", label: "Force" }] },
  {
    label: "Course",
    goals: [
      { value: "course_10k", label: "10 km" },
      { value: "semi_marathon", label: "Semi-marathon" },
      { value: "marathon", label: "Marathon" },
    ],
  },
  {
    label: "Triathlon",
    goals: [
      { value: "triathlon_s", label: "Triathlon S" },
      { value: "triathlon_m", label: "Triathlon M" },
      { value: "triathlon_70_3", label: "70.3" },
      { value: "triathlon_ironman", label: "Ironman" },
    ],
  },
  {
    label: "Autres",
    goals: [
      { value: "hyrox", label: "Hyrox" },
      { value: "raquette", label: "Sports de raquette" },
      { value: "collectif", label: "Sports collectifs" },
      { value: "forme", label: "Forme générale" },
    ],
  },
];

export const GOAL_LABELS = Object.fromEntries(
  GOAL_GROUPS.flatMap((g) => g.goals.map((goal) => [goal.value, goal.label])),
) as Record<GoalType, string>;

/** Objectifs qui ont souvent une date de compétition. */
export const GOALS_WITH_EVENT: GoalType[] = [
  "hyrox",
  "course_10k",
  "semi_marathon",
  "marathon",
  "triathlon_s",
  "triathlon_m",
  "triathlon_70_3",
  "triathlon_ironman",
];

/** Rythme de poids visé (kg/semaine) selon l'objectif, quand il y en a un. */
export function weightRateTarget(goal: GoalType | null | undefined): { min: number; max: number } | null {
  switch (goal) {
    case "prise_de_masse":
      return { min: 0.25, max: 0.5 };
    case "seche":
      return { min: -1, max: -0.25 };
    default:
      return null;
  }
}
