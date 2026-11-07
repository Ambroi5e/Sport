"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { STYLE_IDS } from "@/lib/appearance";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PREFERENCE_COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: true } as const;

export async function setTheme(formData: FormData) {
  const theme = z.enum(["dark", "light"]).catch("dark").parse(formData.get("theme"));
  (await cookies()).set("theme", theme, PREFERENCE_COOKIE);
  revalidatePath("/", "layout");
}

export async function setStyle(formData: FormData) {
  const style = z.enum(STYLE_IDS).catch("fonte").parse(formData.get("style"));
  (await cookies()).set("style", style, PREFERENCE_COOKIE);
  revalidatePath("/", "layout");
}

export async function setWeightUnit(formData: FormData) {
  const userId = await requireUserId();
  const unit = z.enum(["kg", "lb"]).catch("kg").parse(formData.get("unit"));
  const supabase = await createClient();
  await supabase.from("profiles").update({ weight_unit: unit }).eq("user_id", userId);
  revalidatePath("/", "layout");
}
