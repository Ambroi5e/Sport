"use server";

import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { code?: string; expiresAt?: string; error?: string };

export async function createInvite(_prev: InviteState): Promise<InviteState> {
  if (!(await isAdmin())) return { error: "Réservé à l'administrateur." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation", { p_valid_days: 14 });
  if (error || !data?.[0]) return { error: "Le code n'a pas pu être créé. Réessaie." };
  return { code: data[0].code, expiresAt: data[0].expires_at };
}
