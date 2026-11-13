"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { FRIEND_CODE, isShareCategory, normalizeFriendCode } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { code?: string; expiresAt?: string; error?: string };
export type AcceptState = { error?: string; value?: string };

const id = z.uuid();

/** Crée un code d'ami. Il n'est lisible qu'ici, une fois : la base n'en garde que l'empreinte. */
export async function createFriendInvite(): Promise<InviteState> {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_friend_invite");
  if (error?.message.includes("too_many_invites")) return { error: "Tu as déjà cinq codes en attente. Ils expirent au bout de 7 jours." };
  if (error || !data?.[0]) return { error: "Le code n'a pas pu être créé. Vérifie ta connexion et réessaie." };
  return { code: data[0].code, expiresAt: data[0].expires_at };
}

/** Saisir le code d'un ami : l'amitié est créée, on arrive sur sa fiche pour choisir quoi lui montrer. */
export async function acceptFriendInvite(_: AcceptState, formData: FormData): Promise<AcceptState> {
  await requireUserId();
  const value = String(formData.get("code") ?? "").slice(0, 40);
  const code = normalizeFriendCode(value);
  if (!FRIEND_CODE.test(code)) return { value, error: "Un code d'ami ressemble à AMI-AB12-CD34." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_friend_invite", { p_code: code });
  if (error?.message.includes("own_code")) return { value, error: "C'est ton propre code : donne-le à ton ami." };
  if (error?.message.includes("invalid_code")) return { value, error: "Ce code n'existe pas, a déjà servi ou a expiré. Demande-en un nouveau." };
  if (error || !data) return { value, error: "L'ajout n'a pas abouti. Vérifie ta connexion et réessaie." };
  revalidatePath("/amis");
  redirect(`/amis/${data}?bienvenue=1`);
}

/** Ouvre ou ferme une catégorie pour un ami. Fermer supprime la ligne : l'accès tombe tout de suite. */
export async function setShare(friendId: string, category: string, shown: boolean) {
  const userId = await requireUserId();
  const friend = id.parse(friendId);
  if (!isShareCategory(category)) throw new Error("invalid_category");
  const supabase = await createClient();
  const { error } = shown
    ? await supabase.from("share_grants").upsert({ user_id: userId, friend_id: friend, category }, { onConflict: "user_id,friend_id,category", ignoreDuplicates: true })
    : await supabase.from("share_grants").delete().eq("user_id", userId).eq("friend_id", friend).eq("category", category);
  if (error) throw new Error("share_not_saved");
  revalidatePath("/amis");
  revalidatePath(`/amis/${friend}`);
}

/** Retire un ami : des deux côtés, avec tout ce que les deux se montraient (déclencheur en base). */
export async function removeFriend(friendId: string) {
  const userId = await requireUserId();
  const friend = id.parse(friendId);
  const [a, b] = userId < friend ? [userId, friend] : [friend, userId];
  const supabase = await createClient();
  const { error } = await supabase.from("friendships").delete().eq("user_a", a).eq("user_b", b);
  if (error) throw new Error("friend_not_removed");
  revalidatePath("/amis");
  redirect("/amis");
}
