import "server-only";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { adherence, ADHERENCE_DAYS, SUPPLEMENT_MOMENTS } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";
import type { Supplement } from "@/lib/supplements";

/** Les compléments de la personne, dans l'ordre de la journée, avec les prises des 7 derniers jours. */
export async function getSupplements(today: string, timeZone: string): Promise<Supplement[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: supplements }, { data: logs }] = await Promise.all([
    supabase.from("supplements").select("id, name, dose, moment, paused_at, created_at").eq("user_id", userId).order("created_at").order("id"),
    supabase.from("supplement_logs").select("supplement_id, taken_on").eq("user_id", userId).gte("taken_on", addDays(today, 1 - ADHERENCE_DAYS)).lte("taken_on", today),
  ]);
  const taken = new Map<string, string[]>();
  for (const log of logs ?? []) taken.set(log.supplement_id, [...(taken.get(log.supplement_id) ?? []), log.taken_on]);
  return (supplements ?? [])
    .map((s) => {
      const days = taken.get(s.id) ?? [];
      return {
        id: s.id,
        name: s.name,
        dose: s.dose,
        moment: s.moment,
        paused: s.paused_at !== null,
        takenToday: days.includes(today),
        adherence: adherence(days, localDate(timeZone, new Date(s.created_at)), today),
      };
    })
    .sort((a, b) => SUPPLEMENT_MOMENTS.indexOf(a.moment) - SUPPLEMENT_MOMENTS.indexOf(b.moment));
}

export async function getSupplement(id: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("supplements").select("id, name, dose, moment, paused_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) notFound();
  return { id: data.id, name: data.name, dose: data.dose, moment: data.moment, paused: data.paused_at !== null };
}
