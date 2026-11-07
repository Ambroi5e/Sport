import "server-only";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, localTime } from "@/lib/dates";
import { mealForTime } from "@/lib/engine";
import { addParams, isDay, isMeal } from "@/lib/nutrition";

/** Jour demandé s'il est valide et passé (deux ans au plus), sinon aujourd'hui. */
export function pickDay(value: string | undefined, today: string): string {
  return isDay(value) && value <= today && value >= addDays(today, -730) ? value : today;
}

/** Repas et jour des écrans d'ajout ; sans repas précisé, celui de l'heure qu'il est. */
export async function addContext(search: { repas?: string; jour?: string }) {
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const day = pickDay(search.jour, today);
  const { hour, minute } = localTime(profile.timezone);
  const meal = isMeal(search.repas) ? search.repas : mealForTime(hour, minute);
  return { profile, today, day, meal, params: addParams(meal, day, today) };
}
