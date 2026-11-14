import "server-only";
import { requireUserId } from "@/lib/auth";
import { normalizeSplits, type HyroxRace } from "@/lib/engine";
import { createClient } from "@/lib/supabase/server";

const COLUMNS = "id, performed_on, duration_minutes, duration_extra_s, hyrox_splits";

type Row = { id: string; performed_on: string; duration_minutes: number; duration_extra_s: number; hyrox_splits: (number | null)[] | null };

function fromRow(r: Row): HyroxRace {
  return { id: r.id, date: r.performed_on, seconds: r.duration_minutes * 60 + r.duration_extra_s, splits: normalizeSplits(r.hyrox_splits) };
}

/** Toutes les courses Hyrox, la plus récente en premier. */
export async function getHyroxRaces(): Promise<HyroxRace[]> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("sport", "hyrox")
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map(fromRow);
}

export async function getHyroxRace(id: string): Promise<HyroxRace | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select(COLUMNS).eq("user_id", userId).eq("sport", "hyrox").eq("id", id).maybeSingle();
  return data ? fromRow(data) : null;
}
