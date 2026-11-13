import "server-only";
import { cache } from "react";
import { friendName, type Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";

/** Mes amis, avec ce que chacun me montre et ce que je lui montre. */
export const getFriends = cache(async (): Promise<Friend[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("friends_overview");
  return (data ?? []).map((f) => ({ id: f.friend_id, name: friendName(f.display_name), since: f.since, shownToMe: f.shown_to_me, shownByMe: f.shown_by_me }));
});

/**
 * Ce qu'un ami me montre. Chaque lecture passe par sa fonction, qui vérifie la
 * permission côté base : on ne demande que les catégories ouvertes, et une
 * permission retirée entre-temps donne simplement une section vide.
 */
export async function getFriendData(friend: Friend) {
  const supabase = await createClient();
  const shown = (category: Friend["shownToMe"][number]) => friend.shownToMe.includes(category);
  const owner = { p_owner: friend.id };
  const [workouts, activities, records, weights, measurements, nutrition, checkins] = await Promise.all([
    shown("seances") ? supabase.rpc("friend_workouts", owner) : null,
    shown("seances") ? supabase.rpc("friend_activities", owner) : null,
    shown("records") ? supabase.rpc("friend_records", owner) : null,
    shown("poids") ? supabase.rpc("friend_weights", owner) : null,
    shown("mensurations") ? supabase.rpc("friend_measurements", owner) : null,
    shown("nutrition") ? supabase.rpc("friend_nutrition", owner) : null,
    shown("forme") ? supabase.rpc("friend_checkins", owner) : null,
  ]);
  return {
    workouts: (workouts?.data ?? []).map((w) => ({ date: w.performed_on, name: w.name, minutes: w.minutes, sets: w.sets, volumeKg: Number(w.volume_kg), isLight: w.is_light })),
    activities: (activities?.data ?? []).map((a) => ({ date: a.performed_on, sport: a.sport, label: a.label as string | null, minutes: a.duration_minutes, intensity: a.intensity })),
    records: (records?.data ?? []).map((r) => ({ exercise: r.exercise_name, kg: Number(r.weight_kg), reps: r.reps, e1rmKg: Number(r.e1rm_kg), date: r.performed_on })),
    weights: (weights?.data ?? []).map((w) => ({ date: w.measured_on, kg: Number(w.weight_kg) })),
    measurements: (measurements?.data ?? []).map((m) => ({ site: m.site, cm: Number(m.value_cm), date: m.measured_on })),
    nutrition: (nutrition?.data ?? []).map((n) => ({ date: n.eaten_on, kcal: Number(n.kcal), protein: Number(n.protein_g), carbs: Number(n.carbs_g), fat: Number(n.fat_g) })),
    checkins: (checkins?.data ?? []).map((c) => ({ date: c.checkin_on, sleep: c.sleep, soreness: c.soreness, energy: c.energy, stress: c.stress })),
  };
}

export type FriendData = Awaited<ReturnType<typeof getFriendData>>;
