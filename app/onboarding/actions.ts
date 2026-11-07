"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { toKg } from "@/lib/engine";
import { defaultModules } from "@/lib/modules";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  birthYear: z.coerce.number().int().min(1920).max(new Date().getFullYear() - 10),
  sex: z.enum(Constants.public.Enums.sex),
  heightCm: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(20).max(900),
  goal: z.enum(Constants.public.Enums.goal_type),
  level: z.enum(Constants.public.Enums.training_level),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sessionsPerWeek: z.coerce.number().int().min(0).max(14),
  weightUnit: z.enum(["kg", "lb"]),
  timezone: z.string().max(64).optional(),
});

type Supabase = Awaited<ReturnType<typeof createClient>>;

// L'index unique sur l'objectif principal est partiel : pas d'upsert possible, on met à jour ou on crée.
async function savePrimaryGoal(supabase: Supabase, userId: string, goal: z.infer<typeof schema>["goal"], targetDate: string | null) {
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  if (existing) {
    return supabase.from("goals").update({ type: goal, target_date: targetDate }).eq("id", existing.id);
  }
  return supabase.from("goals").insert({ user_id: userId, type: goal, is_primary: true, target_date: targetDate });
}

export type OnboardingState = { error?: string; fields?: string[] };

export async function saveOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const userId = await requireUserId();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Quelques réponses manquent ou sortent des valeurs possibles. Vérifie les champs signalés.",
      fields: parsed.error.issues.map((i) => String(i.path[0])),
    };
  }
  const v = parsed.data;
  const timezone = v.timezone && Intl.supportedValuesOf("timeZone").includes(v.timezone) ? v.timezone : "Europe/Paris";
  const supabase = await createClient();

  const steps = await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: v.displayName,
        birth_year: v.birthYear,
        sex: v.sex,
        height_cm: v.heightCm,
        level: v.level,
        sessions_per_week: v.sessionsPerWeek,
        weight_unit: v.weightUnit,
        timezone,
      })
      .eq("user_id", userId),
    savePrimaryGoal(supabase, userId, v.goal, v.targetDate ?? null),
    supabase
      .from("body_weights")
      .upsert(
        { user_id: userId, measured_on: localDate(timezone), weight_kg: Math.round(toKg(v.weightUnit, v.weight) * 100) / 100 },
        { onConflict: "user_id,measured_on" },
      ),
    supabase
      .from("user_modules")
      .upsert(defaultModules(v.goal).map((module) => ({ user_id: userId, module, enabled: true })), {
        onConflict: "user_id,module",
      }),
  ]);

  const failed = steps.find((s) => s.error);
  if (failed?.error) {
    console.error("onboarding", failed.error.message);
    return { error: "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { error: "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie." };

  redirect("/");
}
