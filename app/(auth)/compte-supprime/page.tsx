import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClearDevice } from "@/components/settings/clear-device";
import { buttonClasses } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";

export const metadata: Metadata = { title: "Compte supprimé" };

/** Après la suppression : la session est fermée ; on vide aussi le téléphone. */
export default async function AccountDeletedPage() {
  // Une personne connectée n'a rien supprimé : retour à l'accueil.
  if (await getUserId()) redirect("/");
  return (
    <div className="grid gap-5">
      <ClearDevice />
      <div className="grid gap-2">
        <h1 className="font-title text-[28px]">Compte supprimé</h1>
        <p className="text-[15px] text-muted">
          Ton compte et toutes tes données, photos comprises, ont été effacés de Fonte. Ce que l&apos;app gardait sur ce téléphone aussi.
        </p>
      </div>
      <Link href="/connexion" className={buttonClasses("secondary", "md", "justify-self-start")}>
        Retour à la connexion
      </Link>
    </div>
  );
}
