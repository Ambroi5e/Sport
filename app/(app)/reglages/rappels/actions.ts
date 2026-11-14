"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { MAX_PUSH_DEVICES, REMINDER_KINDS, REMINDERS, toTime } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import { isPushEndpoint } from "@/supabase/functions/rappels/vapid";

export type ReminderState = { error?: string; saved?: string };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";

/** Enregistre les heures des rappels allumés et les jours du rappel de séance. */
export async function saveReminders(_prev: ReminderState, formData: FormData): Promise<ReminderState> {
  const userId = await requireUserId();
  const row: { workout_at: string | null; checkin_at: string | null; supplements_at: string | null; review_at: string | null } = {
    workout_at: null,
    checkin_at: null,
    supplements_at: null,
    review_at: null,
  };
  for (const kind of REMINDER_KINDS) {
    if (formData.get(`actif-${kind}`) !== "on") continue;
    const time = toTime(formData.get(`heure-${kind}`));
    if (!time) return { error: `Choisis une heure pour le rappel « ${REMINDERS[kind].label} ».` };
    row[REMINDERS[kind].column] = time;
  }
  const days = z.array(z.coerce.number().int().min(1).max(7)).max(7).safeParse(formData.getAll("jour"));
  if (!days.success) return { error: "Choisis les jours parmi ceux de la semaine." };
  const workoutDays = [...new Set(days.data)].sort();
  if (row.workout_at && workoutDays.length === 0) return { error: "Choisis au moins un jour pour le rappel de séance." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reminder_settings")
    .upsert({ user_id: userId, ...row, ...(workoutDays.length ? { workout_days: workoutDays } : {}) }, { onConflict: "user_id" });
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/reglages/rappels");
  const count = Object.values(row).filter(Boolean).length;
  return { saved: count === 0 ? "Tous les rappels sont éteints." : `${count} rappel${count > 1 ? "s" : ""} enregistré${count > 1 ? "s" : ""}.` };
}

/** Abonne cet appareil : on ne garde que l'adresse du signal donnée par le navigateur. */
export async function subscribeDevice(endpoint: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  if (!isPushEndpoint(endpoint)) return { error: "Ce navigateur utilise un service de notifications que Fonte ne connaît pas." };
  const supabase = await createClient();
  const { data: known } = await supabase.from("push_subscriptions").select("endpoint").eq("user_id", userId).limit(MAX_PUSH_DEVICES + 1);
  if (known?.some((s) => s.endpoint === endpoint)) return {};
  if ((known?.length ?? 0) >= MAX_PUSH_DEVICES) return { error: `${MAX_PUSH_DEVICES} appareils au plus. Désactive les rappels sur un autre appareil d'abord.` };
  const { error } = await supabase.from("push_subscriptions").upsert({ user_id: userId, endpoint }, { onConflict: "user_id,endpoint", ignoreDuplicates: true });
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/reglages/rappels");
  return {};
}

/** Retire cet appareil des rappels. */
export async function unsubscribeDevice(endpoint: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = z.string().max(1000).safeParse(endpoint);
  if (!parsed.success) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", parsed.data);
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/reglages/rappels");
  return {};
}
