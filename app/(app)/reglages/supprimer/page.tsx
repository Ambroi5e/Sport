import type { Metadata } from "next";
import { DeleteAccountView } from "@/components/settings/delete-account-view";
import { PageHeader } from "@/components/ui/page-header";
import { isAdmin, requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "../actions";

export const metadata: Metadata = { title: "Supprimer mon compte" };

const plural = (n: number, one: string, many: string) => `${new Intl.NumberFormat("fr-FR").format(n)} ${n > 1 ? many : one}`;

/** Ce que la personne va perdre, chiffré : plus parlant qu'une liste abstraite. */
async function counts(userId: string) {
  const supabase = await createClient();
  const count = async (table: "workouts" | "food_logs" | "body_weights" | "progress_photos") => {
    const { count: n } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    return n ?? 0;
  };
  const [workouts, meals, weights, photos] = await Promise.all([count("workouts"), count("food_logs"), count("body_weights"), count("progress_photos")]);
  return [
    workouts ? plural(workouts, "séance", "séances") : null,
    meals ? plural(meals, "aliment noté", "aliments notés") : null,
    weights ? plural(weights, "pesée", "pesées") : null,
    photos ? plural(photos, "photo", "photos") : null,
  ].filter((s): s is string => s !== null);
}

export default async function DeleteAccountPage() {
  const userId = await requireUserId();
  const [admin, summary] = await Promise.all([isAdmin(), counts(userId)]);

  return (
    <>
      <PageHeader title="Supprimer mon compte" back="/reglages" />
      <DeleteAccountView summary={summary} admin={admin} action={deleteAccount} />
    </>
  );
}
