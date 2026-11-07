import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="pt-safe mx-auto grid min-h-dvh max-w-[420px] content-center gap-5 px-4">
      <Logo size={40} />
      <p className="font-numeric text-[64px] text-accent-text">404</p>
      <h1 className="font-title text-[28px]">Cette page n&apos;existe pas</h1>
      <p className="text-[15px] text-muted">Le lien est peut-être ancien ou mal recopié.</p>
      <Link href="/" className="justify-self-start rounded-control bg-accent px-5 py-3 font-semibold text-on-accent">
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
