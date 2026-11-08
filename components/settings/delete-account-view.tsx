import { DownloadSimpleIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { DeleteAccountState } from "@/app/(app)/reglages/actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteAccountForm } from "./delete-account-form";

/** Écran de suppression : ce qui disparaît (chiffré), l'export d'abord, puis la confirmation tapée. */
export function DeleteAccountView({
  summary,
  admin,
  action,
  exportHref = "/reglages/donnees",
}: {
  summary: string[];
  admin: boolean;
  action: (state: DeleteAccountState, formData: FormData) => Promise<DeleteAccountState>;
  exportHref?: string;
}) {
  return (
    <div className="grid gap-4 md:max-w-xl">
      <Card aria-labelledby="efface-titre" className="grid gap-3">
        <h2 id="efface-titre" className="text-lg font-semibold">
          Tout sera effacé, tout de suite
        </h2>
        {summary.length ? <p className="text-[15px]">{summary.join(", ")}, et le reste :</p> : null}
        <ul className="grid list-disc gap-1.5 pl-5 text-[15px] text-muted marker:text-muted">
          <li>ton compte et ta connexion (e-mail ou Google) ;</li>
          <li>tes séances, séries, programmes, modèles et sports ;</li>
          <li>tes aliments, recettes, repas et ton journal ;</li>
          <li>tes pesées, mensurations, photos de progression et ta forme du jour ;</li>
          <li>tes objectifs et réglages.</li>
        </ul>
        <p className="text-[15px]">Personne ne pourra les récupérer depuis Fonte, pas même l&apos;administrateur.</p>
      </Card>

      <Card aria-labelledby="avant-titre" className="grid gap-3">
        <h2 id="avant-titre" className="text-lg font-semibold">
          Avant, garde une copie
        </h2>
        <p className="text-[15px] text-muted">Une archive avec toutes tes données et tes photos, à garder ou à emmener ailleurs.</p>
        <Link href={exportHref} className={buttonClasses("secondary", "md", "justify-self-start")}>
          <DownloadSimpleIcon size={18} weight="bold" aria-hidden="true" /> Exporter mes données
        </Link>
      </Card>

      {admin ? (
        <p role="note" className="flex gap-3 rounded-control border border-warning/60 p-4 text-[15px]">
          <WarningIcon size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <span>Tu es administrateur : sans ton compte, plus personne ne pourra créer de code d&apos;invitation.</span>
        </p>
      ) : null}

      <Card aria-labelledby="confirmer-titre" className="grid gap-4">
        <h2 id="confirmer-titre" className="text-lg font-semibold">
          Confirmer
        </h2>
        <DeleteAccountForm action={action} />
      </Card>
    </div>
  );
}
