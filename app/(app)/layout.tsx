import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { getProfile, isAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, admin] = await Promise.all([getProfile(), isAdmin()]);
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh">
      <AppNav isAdmin={admin} />
      <main className="pt-safe mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pb-[calc(152px+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-12">
        {children}
      </main>
    </div>
  );
}
