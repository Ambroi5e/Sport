import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isGoogleEnabled } from "@/lib/auth-providers";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Connexion" };

const NOTICES = {
  "google-sans-compte": "googleNoAccount",
  google: "googleFailed",
  "lien-expire": "linkExpired",
} as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string; lien?: string }> }) {
  const [t, googleEnabled, params] = await Promise.all([getTranslations("auth"), isGoogleEnabled(), searchParams]);
  const key = params.lien === "expire" ? "lien-expire" : params.erreur;
  const notice = key && key in NOTICES ? NOTICES[key as keyof typeof NOTICES] : null;
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-title text-[28px]">{t("loginTitle")}</h1>
        <p className="text-[15px] text-muted">{t("loginIntro")}</p>
      </div>
      {notice ? (
        <p role="alert" className="rounded-control border border-danger/50 p-3 text-[15px]">
          {t(`errors.${notice}`)}
        </p>
      ) : null}
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </div>
  );
}
