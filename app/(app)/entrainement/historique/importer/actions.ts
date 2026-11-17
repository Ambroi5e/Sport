"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { IMPORT_BATCH, IMPORT_MAX_EXERCISES, IMPORT_MAX_SETS } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";

const setSchema = z.tuple([
  z.number().min(0).max(1000).nullable(),
  z.number().int().min(0).max(1000).nullable(),
  z.number().int().min(0).max(86400).nullable(),
  z.boolean(),
]);

const batchSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      date: z.iso.date(),
      startedAt: z.iso.datetime({ offset: true }),
      minutes: z.number().int().min(1).max(1440).nullable(),
      exercises: z
        .array(z.object({ exerciseId: z.uuid(), sets: z.array(setSchema).min(1).max(IMPORT_MAX_SETS) }))
        .min(1)
        .max(IMPORT_MAX_EXERCISES),
    }),
  )
  .min(1)
  .max(IMPORT_BATCH);

export type ImportBatch = z.input<typeof batchSchema>;
export type ImportResult = { ok: true; added: number; duplicates: number } | { ok: false; error: string };

/**
 * Enregistre un paquet de séances importées (Strong, Hevy), sous RLS comme une
 * saisie normale. Une séance qui commence à la même minute qu'une séance déjà
 * présente est sautée : relancer l'import ne crée pas de doublon.
 */
export async function importWorkouts(batch: ImportBatch): Promise<ImportResult> {
  const userId = await requireUserId();
  const parsed = batchSchema.safeParse(batch);
  if (!parsed.success) return { ok: false, error: "Ce paquet de séances est illisible. Relance l'import depuis le fichier." };
  const profile = await getProfile();
  const tomorrow = addDays(localDate(profile?.timezone ?? "Europe/Paris"), 1);
  const workouts = parsed.data.filter((w) => w.date >= "2000-01-01" && w.date <= tomorrow);

  const minute = (iso: string) => Math.floor(Date.parse(iso) / 60_000);
  const supabase = await createClient();
  const starts = workouts.map((w) => Date.parse(w.startedAt));
  const { data: existing, error: readError } = await supabase
    .from("workouts")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", new Date(Math.min(...starts) - 60_000).toISOString())
    .lte("started_at", new Date(Math.max(...starts) + 60_000).toISOString());
  if (readError) return { ok: false, error: "L'import s'est arrêté. Vérifie ta connexion et relance : les séances déjà enregistrées ne seront pas doublées." };

  const seen = new Set((existing ?? []).map((w) => minute(w.started_at)));
  const fresh = workouts.filter((w) => {
    const m = minute(w.startedAt);
    if (seen.has(m)) return false;
    seen.add(m);
    return true;
  });
  const duplicates = parsed.data.length - fresh.length;
  if (fresh.length === 0) return { ok: true, added: 0, duplicates };

  const endOf = (w: (typeof fresh)[number]) => new Date(Date.parse(w.startedAt) + (w.minutes ?? 0) * 60_000).toISOString();
  const { data: inserted, error } = await supabase
    .from("workouts")
    .insert(fresh.map((w) => ({ name: w.name, performed_on: w.date, started_at: new Date(w.startedAt).toISOString(), ended_at: endOf(w) })))
    .select("id, started_at");
  if (error || !inserted) return { ok: false, error: "L'import s'est arrêté. Vérifie ta connexion et relance : les séances déjà enregistrées ne seront pas doublées." };

  const idByMinute = new Map(inserted.map((w) => [minute(w.started_at), w.id]));
  const rows = fresh.flatMap((w) => {
    const workoutId = idByMinute.get(minute(w.startedAt))!;
    const completedAt = endOf(w);
    return w.exercises.flatMap((e, order) =>
      e.sets.map(([weightKg, reps, seconds, warmup], i) => ({
        workout_id: workoutId,
        exercise_id: e.exerciseId,
        exercise_order: order,
        set_number: i + 1,
        weight_kg: weightKg,
        reps,
        duration_seconds: seconds,
        is_warmup: warmup,
        completed_at: completedAt,
      })),
    );
  });
  const { error: setsError } = await supabase.from("workout_sets").insert(rows);
  if (setsError) {
    // Pas de séance vide : on retire celles de ce paquet pour qu'une relance les recrée.
    await supabase.from("workouts").delete().in("id", inserted.map((w) => w.id));
    return { ok: false, error: "Un exercice choisi n'est plus disponible. Recharge la page et relance l'import." };
  }
  revalidatePath("/entrainement");
  return { ok: true, added: fresh.length, duplicates };
}
