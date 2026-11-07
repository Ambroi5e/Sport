import { Logo } from "@/components/logo";

/** Écrans publics : une colonne étroite, centrée, logo en tête. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe mx-auto grid min-h-dvh w-full max-w-[420px] content-center gap-8 px-4 py-10">
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <span className="font-title text-[34px] uppercase">Fonte</span>
      </div>
      {children}
    </main>
  );
}
