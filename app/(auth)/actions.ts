"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  step: "email" | "code";
  email?: string;
  error?: AuthError;
};

export type AuthError =
  | "invalidEmail"
  | "invalidCode"
  | "invalidInvite"
  | "unknownAccount"
  | "wrongCode"
  | "tooMany"
  | "generic";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const inviteSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .pipe(z.string().regex(/^FONTE[A-Z0-9]{8}$/));
const codeSchema = z.string().trim().regex(/^\d{6,10}$/);

function mapError(error: { status?: number; code?: string; message: string }, mode: "login" | "signup"): AuthError {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "tooMany";
  }
  if (mode === "login" && (error.code === "otp_disabled" || error.code === "signup_disabled" || error.status === 422)) {
    return "unknownAccount";
  }
  // Le déclencheur d'invitation fait échouer la création du compte côté base.
  if (mode === "signup" && (error.code === "unexpected_failure" || /database error/i.test(error.message))) {
    return "invalidInvite";
  }
  return "generic";
}

export async function requestCode(mode: "login" | "signup", _prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", error: "invalidEmail" };

  let inviteCode: string | undefined;
  if (mode === "signup") {
    const invite = inviteSchema.safeParse(formData.get("invite"));
    if (!invite.success) return { step: "email", email: email.data, error: "invalidInvite" };
    inviteCode = invite.data;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: mode === "signup",
      emailRedirectTo: `${env.siteUrl}/auth/confirm`,
      data: inviteCode ? { invite_code: inviteCode } : undefined,
    },
  });

  if (error) return { step: "email", email: email.data, error: mapError(error, mode) };
  return { step: "code", email: email.data };
}

export async function verifyCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", error: "invalidEmail" };
  const token = codeSchema.safeParse(formData.get("code"));
  if (!token.success) return { step: "code", email: email.data, error: "invalidCode" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: token.data, type: "email" });
  if (error) {
    return { step: "code", email: email.data, error: error.status === 429 ? "tooMany" : "wrongCode" };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
