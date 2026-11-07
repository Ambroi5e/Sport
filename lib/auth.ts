import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Utilisateur connecté (vérifié par signature du JWT) ou null. Mis en cache par requête. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");
  return userId;
}

export const getProfile = cache(async () => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  return data;
});

export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});
