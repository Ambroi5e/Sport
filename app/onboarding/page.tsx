import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getProfile } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (profile?.onboarded_at) redirect("/");

  return (
    <main className="pt-safe mx-auto grid min-h-dvh w-full max-w-[560px] content-start gap-6 px-4 pb-10 pt-6 md:pt-12">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="font-title text-2xl uppercase">Fonte</span>
      </div>
      <OnboardingForm />
    </main>
  );
}
