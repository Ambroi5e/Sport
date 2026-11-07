import type { Enums } from "@/lib/supabase/database.types";
import type { GoalType } from "@/lib/goals";

export type AppModule = Enums<"app_module">;

const ALWAYS: AppModule[] = ["corps", "nutrition", "courses", "complements", "planning", "amis", "sports"];

/**
 * Modules activés par défaut selon l'objectif principal.
 * Un marathonien voit l'endurance, un pratiquant esthétique la musculation ;
 * tout reste activable à la main ensuite.
 */
export function defaultModules(goal: GoalType): AppModule[] {
  const specific: AppModule[] = (() => {
    switch (goal) {
      case "prise_de_masse":
      case "seche":
      case "recomposition":
      case "force":
        return ["musculation"];
      case "hyrox":
        return ["hyrox", "endurance", "musculation"];
      case "course_10k":
      case "semi_marathon":
      case "marathon":
      case "triathlon_s":
      case "triathlon_m":
      case "triathlon_70_3":
      case "triathlon_ironman":
        return ["endurance"];
      case "raquette":
      case "collectif":
      case "forme":
        return ["musculation", "endurance"];
    }
  })();
  return [...new Set([...specific, ...ALWAYS])];
}
