"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { SUPPLEMENT_MOMENTS } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";
import { MAX_SUPPLEMENTS } from "@/lib/supplements";

export type SupplementState = { error?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";
const id = z.uuid();
const fields = z.object({
  name: z.string().trim().min(1, "Écris le nom du complément.").max(40, "Nom : 40 caractères au maximum."),
  dose: z.string().trim().max(30, "Dose : 30 caractères au maximum."),
  moment: z.enum(SUPPLEMENT_MOMENTS, { error: "Choisis un moment de la journée." }),
});

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");
const read = (formData: FormData) => ({ name: text(formData.get("name")), dose: text(formData.get("dose")), moment: text(formData.get("moment")) });

function refresh() {
  revalidatePath("/nutrition/complements", "layout");
  revalidatePath("/");
}

export async function addSupplement(_prev: SupplementState, formData: FormData): Promise<SupplementState> {
  const userId = await requireUserId();
  const values = read(formData);
  const parsed = fields.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { count } = await supabase.from("supplements").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_SUPPLEMENTS) return { error: `${MAX_SUPPLEMENTS} compléments au maximum : supprime ceux que tu ne prends plus.`, values };
  const { error } = await supabase.from("supplements").insert({ name: parsed.data.name, dose: parsed.data.dose || null, moment: parsed.data.moment });
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  redirect("/nutrition/complements");
}

export async function updateSupplement(supplementId: string, _prev: SupplementState, formData: FormData): Promise<SupplementState> {
  const userId = await requireUserId();
  const values = read(formData);
  const parsed = fields.extend({ id }).safeParse({ ...values, id: supplementId });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplements")
    .update({ name: parsed.data.name, dose: parsed.data.dose || null, moment: parsed.data.moment })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: SAVE_ERROR, values };
  refresh();
  redirect("/nutrition/complements");
}

/** Coche ou décoche la prise d'aujourd'hui (jour local de la personne). */
export async function toggleTaken(supplementId: string, taken: boolean) {
  const userId = await requireUserId();
  if (!id.safeParse(supplementId).success) throw new Error("invalid_supplement");
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  const today = localDate(profile.timezone);
  const supabase = await createClient();
  const { error } = taken
    ? await supabase.from("supplement_logs").upsert({ supplement_id: supplementId, taken_on: today }, { onConflict: "supplement_id,taken_on", ignoreDuplicates: true })
    : await supabase.from("supplement_logs").delete().eq("supplement_id", supplementId).eq("user_id", userId).eq("taken_on", today);
  if (error) throw new Error("supplement_not_saved");
  refresh();
}

/** En pause : le complément sort de la liste du jour, son historique reste. */
export async function setPaused(supplementId: string, paused: boolean) {
  const userId = await requireUserId();
  if (!id.safeParse(supplementId).success) throw new Error("invalid_supplement");
  const supabase = await createClient();
  const { error } = await supabase
    .from("supplements")
    .update({ paused_at: paused ? new Date().toISOString() : null })
    .eq("id", supplementId)
    .eq("user_id", userId);
  if (error) throw new Error("supplement_not_saved");
  refresh();
  redirect("/nutrition/complements");
}

export async function deleteSupplement(supplementId: string) {
  const userId = await requireUserId();
  if (!id.safeParse(supplementId).success) throw new Error("invalid_supplement");
  const supabase = await createClient();
  const { error } = await supabase.from("supplements").delete().eq("id", supplementId).eq("user_id", userId);
  if (error) throw new Error("supplement_not_deleted");
  refresh();
  redirect("/nutrition/complements");
}
