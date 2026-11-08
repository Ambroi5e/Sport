import "server-only";
import { requireUserId } from "@/lib/auth";
import type { DatedCheckin } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";

/** Check-ins depuis `since` (inclus), le plus ancien en premier. */
export async function getCheckins(since: string): Promise<DatedCheckin[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_checkins")
    .select("checkin_on, sleep, soreness, energy, stress")
    .eq("user_id", userId)
    .gte("checkin_on", since)
    .order("checkin_on");
  return (data ?? []).map((c) => ({ date: c.checkin_on, sleep: c.sleep, soreness: c.soreness, energy: c.energy, stress: c.stress }));
}

/** Check-in d'un jour, ou null s'il n'est pas fait. */
export async function getCheckin(day: string): Promise<DatedCheckin | null> {
  return (await getCheckins(day)).find((c) => c.date === day) ?? null;
}
