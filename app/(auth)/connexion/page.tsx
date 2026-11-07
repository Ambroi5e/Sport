import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-title text-[28px]">{t("loginTitle")}</h1>
        <p className="text-[15px] text-muted">{t("loginIntro")}</p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
