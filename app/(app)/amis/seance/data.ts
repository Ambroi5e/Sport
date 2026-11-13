import "server-only";
import { cache } from "react";
import { requireUserId } from "@/lib/auth";
import { groupBoard, groupFeed, isGroupLive, type GroupEvent, type GroupPerson } from "@/lib/engine";
import { friendName } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";

export type LiveGroupSession = { id: string; name: string; joined: boolean; mine: boolean };

/** Les séances communes en cours où je suis invité ou présent. */
export const getLiveGroupSessions = cache(async (): Promise<LiveGroupSession[]> => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data } = await supabase
    .from("group_participants")
    .select("joined_at, group_sessions!inner(id, name, user_id, created_at, ended_at)")
    .eq("user_id", userId)
    .is("group_sessions.ended_at", null)
    .gte("group_sessions.created_at", since)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({ id: p.group_sessions.id, name: p.group_sessions.name, joined: p.joined_at !== null, mine: p.group_sessions.user_id === userId }));
});

/** Une séance commune : ses participants, le résumé de chacun et le fil. `null` si je n'y suis pas invité. */
export async function getGroupSession(id: string) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: session }, { data: peopleRows }, { data: eventRows }] = await Promise.all([
    supabase.from("group_sessions").select("id, name, user_id, created_at, ended_at").eq("id", id).maybeSingle(),
    supabase.rpc("group_people", { p_session: id }),
    // Vide tant qu'on n'a pas rejoint : la politique de lecture le garantit.
    supabase.from("group_events").select("id, user_id, exercise_name, weight_kg, reps, duration_seconds, created_at").eq("session_id", id).order("created_at", { ascending: false }).limit(500),
  ]);
  if (!session || !peopleRows) return null;

  const people: GroupPerson[] = peopleRows.map((p) => ({ userId: p.user_id, name: friendName(p.display_name), joinedAt: p.joined_at as string | null, isOwner: p.is_owner }));
  const events: GroupEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    userId: e.user_id,
    exercise: e.exercise_name,
    weightKg: e.weight_kg,
    reps: e.reps,
    durationSeconds: e.duration_seconds,
    at: e.created_at,
  }));
  const me = people.find((p) => p.userId === userId);
  if (!me) return null;
  return {
    id: session.id,
    name: session.name,
    createdAt: session.created_at,
    live: isGroupLive({ createdAt: session.created_at, endedAt: session.ended_at }, Date.now()),
    me: { userId, joined: me.joinedAt !== null, isOwner: me.isOwner },
    board: groupBoard(people, events),
    feed: groupFeed(events),
  };
}

export type GroupSessionView = NonNullable<Awaited<ReturnType<typeof getGroupSession>>>;
