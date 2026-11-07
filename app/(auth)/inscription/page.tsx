import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isGoogleEnabled } from "@/lib/auth-providers";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Inscription" };

export default async function SignupPage() {
  const [t, googleEnabled] = await Promise.all([getTranslations("auth"), isGoogleEnabled()]);
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-title text-[28px]">{t("signupTitle")}</h1>
        <p className="text-[15px] text-muted">{t("signupIntro")}</p>
      </div>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </div>
  );
}
