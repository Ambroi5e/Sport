"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setTheme(formData: FormData) {
  const theme = z.enum(["dark", "light"]).catch("dark").parse(formData.get("theme"));
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: true });
  revalidatePath("/", "layout");
}

export async function setWeightUnit(formData: FormData) {
  const userId = await requireUserId();
  const unit = z.enum(["kg", "lb"]).catch("kg").parse(formData.get("unit"));
  const supabase = await createClient();
  await supabase.from("profiles").update({ weight_unit: unit }).eq("user_id", userId);
  revalidatePath("/", "layout");
}
