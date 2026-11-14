import "server-only";
import { requireUserId } from "@/lib/auth";
import { NO_REMINDERS, REMINDER_KINDS, REMINDERS, toTime, type ReminderSettings } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";

export async function getReminderSettings(): Promise<ReminderSettings> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reminder_settings")
    .select("workout_at, workout_days, checkin_at, supplements_at, review_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return NO_REMINDERS;
  const times = { ...NO_REMINDERS.times };
  for (const kind of REMINDER_KINDS) times[kind] = toTime(data[REMINDERS[kind].column]);
  return { times, workoutDays: [...data.workout_days].sort() };
}

/** Clé publique VAPID du serveur ; `null` tant que les rappels n'y sont pas installés. */
export async function getPushPublicKey(): Promise<string | null> {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("push_public_key");
  return error || !data ? null : data;
}

/** Nombre d'appareils abonnés aux rappels. */
export async function getPushDeviceCount(): Promise<number> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}
