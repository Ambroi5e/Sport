import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ResumeSession } from "@/components/offline/resume-session";

export const metadata: Metadata = { title: "Hors ligne" };

// Page servie par le service worker quand le réseau manque, sans donnée personnelle : le lien
// vers la séance gardée est ajouté dans le navigateur. Rendue à la demande pour que ses scripts
// portent le nonce de la CSP (une page statique n'en a pas, et ses scripts seraient bloqués).
export const dynamic = "force-dynamic";

export default function OfflinePage() {
  return (
    <main className="pt-safe mx-auto grid min-h-dvh max-w-[420px] content-center gap-5 px-4">
      <Logo size={40} />
      <h1 className="font-title text-[28px]">Pas de connexion</h1>
      <p className="text-[15px] text-muted">
        Fonte n&apos;arrive pas à joindre le serveur. Vérifie ton réseau, puis réessaie.
      </p>
      <ResumeSession />
      {/* Rechargement complet voulu : la navigation côté client ne marche pas hors ligne. */}
      {/* oxlint-disable-next-line nextjs/no-html-link-for-pages */}
      <a href="/" className="justify-self-start rounded-control border border-line bg-surface-2 px-5 py-3 font-semibold text-text">
        Réessayer
      </a>
    </main>
  );
}
