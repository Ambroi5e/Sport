import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { NOTIFICATION_WINDOW_MIN, reminderNotifications } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";

/**
 * Ce que le service worker affiche quand un signal arrive : le signal est vide,
 * le texte vient d'ici, avec la session de la personne. Sans session ou sans envoi
 * récent, la liste est vide et le service worker affiche un rappel sans détail.
 */
export async function GET() {
  const userId = await getUserId();
  let kinds: string[] = [];
  if (userId) {
    const supabase = await createClient();
    const since = new Date(Date.now() - NOTIFICATION_WINDOW_MIN * 60_000).toISOString();
    const { data } = await supabase.from("reminder_log").select("kind").eq("user_id", userId).gte("sent_at", since);
    kinds = (data ?? []).map((r) => r.kind);
  }
  return NextResponse.json(reminderNotifications(kinds), { headers: { "Cache-Control": "private, no-store" } });
}
