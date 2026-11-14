import "server-only";
import { requireUserId } from "@/lib/auth";
import type { RacePlan } from "@/lib/races";
import { createClient } from "@/lib/supabase/server";

const COLUMNS = "id, name, race_on, distance_m, target_seconds";

type Row = { id: string; name: string; race_on: string; distance_m: number; target_seconds: number | null };

const fromRow = (r: Row): RacePlan => ({ id: r.id, name: r.name, date: r.race_on, distanceM: r.distance_m, targetSeconds: r.target_seconds });

/** Tous les objectifs de course, du plus proche au plus lointain. */
export async function getRacePlans(): Promise<RacePlan[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("race_plans").select(COLUMNS).eq("user_id", userId).order("race_on").limit(100);
  return (data ?? []).map(fromRow);
}

export async function getRacePlan(id: string): Promise<RacePlan | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("race_plans").select(COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  return data ? fromRow(data) : null;
}
