import type { Metadata } from "next";
import Link from "next/link";
import { ExportButton } from "@/components/settings/export-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Mes données" };

export default function DataPage() {
  return (
    <>
      <PageHeader title="Mes données" back="/reglages" />
      <div className="grid gap-4 md:max-w-xl">
        <Card aria-labelledby="archive-titre" className="grid gap-4">
          <div className="grid gap-1.5">
            <h2 id="archive-titre" className="text-lg font-semibold">
              Tout récupérer
            </h2>
            <p className="text-[15px] text-muted">Une archive zip avec tout ce que Fonte garde pour toi :</p>
          </div>
          <ul className="grid gap-2 text-[15px]">
            <li>
              <span className="font-medium">donnees.json</span> <span className="text-muted">: tout, pour l&apos;emmener dans une autre app.</span>
            </li>
            <li>
              <span className="font-medium">csv/</span>{" "}
              <span className="text-muted">: séances, séries, journal, pesées… un fichier par table, pour un tableur.</span>
            </li>
            <li>
              <span className="font-medium">photos/</span> <span className="text-muted">: tes photos de progression.</span>
            </li>
          </ul>
          <ExportButton />
          <p className="text-[13px] text-muted">
            L&apos;archive se prépare sur ton téléphone : les photos viennent directement de leur espace privé, sans passer par le serveur
            de Fonte.
          </p>
        </Card>

        <Card aria-labelledby="json-titre" className="grid gap-3">
          <h2 id="json-titre" className="text-lg font-semibold">
            Données seules
          </h2>
          <p className="text-[15px] text-muted">Le fichier JSON, sans les photos ni les CSV. Plus léger, pour un ordinateur.</p>
          <a
            href="/reglages/donnees/export"
            download
            className="inline-flex min-h-11 items-center justify-self-start text-[15px] font-medium text-accent-text underline-offset-4 hover:underline"
          >
            Télécharger le JSON
          </a>
        </Card>

        <p className="text-[14px] text-muted">
          Ce que Fonte garde et qui peut le lire :{" "}
          <Link href="/confidentialite" className="font-medium text-accent-text underline underline-offset-4">
            Confidentialité
          </Link>
          .
        </p>
      </div>
    </>
  );
}
