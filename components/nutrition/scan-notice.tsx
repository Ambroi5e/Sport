import { CheckCircleIcon, InfoIcon, WarningIcon } from "@phosphor-icons/react/ssr";

type Kind = "trouve" | "incomplet" | "inconnu" | "erreur";

const TEXT: Record<Kind, { title: string; body: string }> = {
  trouve: { title: "Trouvé sur Open Food Facts", body: "Vérifie les valeurs avec l'emballage avant d'enregistrer : la fiche est remplie par des bénévoles." },
  incomplet: { title: "Fiche Open Food Facts incomplète", body: "Il manque des valeurs pour 100 g. Photographie l'étiquette : Fonte lira ce qui manque." },
  inconnu: { title: "Produit inconnu d'Open Food Facts", body: "Photographie son étiquette : Fonte lira les valeurs pour 100 g, à vérifier avant d'enregistrer." },
  erreur: { title: "Open Food Facts ne répond pas", body: "Photographie l'étiquette, ou réessaie dans un moment." },
};

/** D'où viennent les valeurs proposées après un scan, avec le lien vers la fiche (licence ODbL). */
export function ScanNotice({ code, kind }: { code: string; kind: Kind }) {
  const Icon = kind === "trouve" ? CheckCircleIcon : kind === "erreur" ? WarningIcon : InfoIcon;
  const t = TEXT[kind];
  return (
    <div className="flex gap-3 rounded-control border border-line bg-surface p-4" role="status">
      <Icon size={20} weight={kind === "trouve" ? "fill" : "regular"} className={kind === "erreur" ? "mt-0.5 shrink-0 text-warning" : "mt-0.5 shrink-0 text-accent-text"} aria-hidden="true" />
      <div className="grid gap-1">
        <p className="text-[15px] font-medium">{t.title}</p>
        <p className="text-[14px] text-muted">{t.body}</p>
        {kind === "trouve" || kind === "incomplet" ? (
          <a
            href={`https://world.openfoodfacts.org/product/${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="justify-self-start text-[13px] text-muted underline underline-offset-4 hover:text-text"
          >
            Fiche Open Food Facts (licence ODbL)
          </a>
        ) : null}
      </div>
    </div>
  );
}
