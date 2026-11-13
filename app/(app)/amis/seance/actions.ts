"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type GroupFormState = { error?: string; name?: string; friends?: string[] };

const id = z.uuid();
const form = z.object({
  name: z.string().trim().min(1).max(40),
  friends: z.array(id).min(1).max(8),
});

function refresh(sessionId?: string) {
  revalidatePath("/amis");
  revalidatePath("/entrainement");
  if (sessionId) revalidatePath(`/amis/seance/${sessionId}`);
}

/** Lance une séance commune et y invite des amis. Celui qui lance y est présent d'emblée. */
export async function createGroupSession(_: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").slice(0, 60);
  const friends = formData.getAll("friends").map(String).slice(0, 20);
  const parsed = form.safeParse({ name: name.trim() || "Séance commune", friends });
  if (!parsed.success) return { name, friends, error: friends.length === 0 ? "Choisis au moins un ami à inviter." : "Huit amis au plus, et un nom de 40 caractères au plus." };

  const supabase = await createClient();
  const { data: session, error } = await supabase.from("group_sessions").insert({ user_id: userId, name: parsed.data.name }).select("id").single();
  if (error || !session) return { name, friends, error: "La séance commune n'a pas pu être lancée. Vérifie ta connexion et réessaie." };
  const { error: inviteError } = await supabase.from("group_participants").insert([
    { session_id: session.id, user_id: userId, joined_at: new Date().toISOString() },
    ...parsed.data.friends.map((friend) => ({ session_id: session.id, user_id: friend })),
  ]);
  if (inviteError) {
    // Un invité n'est plus un ami : on ne laisse pas une séance commune sans participants.
    await supabase.from("group_sessions").delete().eq("id", session.id).eq("user_id", userId);
    return { name, friends, error: "Les invitations n'ont pas pu partir : on ne peut inviter que ses amis. Recharge la page et réessaie." };
  }
  refresh();
  redirect(`/amis/seance/${session.id}`);
}

/** Rejoindre : à partir de maintenant, mes séries terminées partent dans le fil de cette séance commune. */
export async function joinGroupSession(sessionId: string) {
  const userId = await requireUserId();
  const session = id.parse(sessionId);
  const supabase = await createClient();
  const { error } = await supabase.from("group_participants").update({ joined_at: new Date().toISOString() }).eq("session_id", session).eq("user_id", userId).is("joined_at", null);
  if (error) throw new Error("group_not_joined");
  refresh(session);
}

/** Quitter (ou décliner) : mes prochaines séries ne partent plus dans le fil. */
export async function leaveGroupSession(sessionId: string) {
  const userId = await requireUserId();
  const session = id.parse(sessionId);
  const supabase = await createClient();
  const { error } = await supabase.from("group_participants").delete().eq("session_id", session).eq("user_id", userId);
  if (error) throw new Error("group_not_left");
  refresh(session);
  redirect("/amis");
}

/** Terminer pour tout le monde : réservé à celui qui a lancé la séance commune (RLS). */
export async function endGroupSession(sessionId: string) {
  const userId = await requireUserId();
  const session = id.parse(sessionId);
  const supabase = await createClient();
  const { error } = await supabase.from("group_sessions").update({ ended_at: new Date().toISOString() }).eq("id", session).eq("user_id", userId).is("ended_at", null);
  if (error) throw new Error("group_not_ended");
  refresh(session);
}
