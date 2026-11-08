import { CaretRightIcon, DownloadSimpleIcon, ShieldCheckIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

function LinkRow({ href, icon, label, detail, danger }: { href: string; icon: ReactNode; label: string; detail: string; danger?: boolean }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 md:px-5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-control bg-surface-2", danger ? "text-danger" : "text-accent-text")} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-medium", danger && "text-danger")}>{label}</span>
        <span className="block text-[13px] text-muted">{detail}</span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}

/** Réglages : export, page Confidentialité et suppression du compte. Comme une carte, sans marge intérieure : les lignes vont jusqu'au bord. */
export function DataPrivacyCard() {
  return (
    <section aria-labelledby="donnees-titre" className="grid gap-2 overflow-hidden rounded-control border border-line bg-surface shadow-card">
      <h2 id="donnees-titre" className="px-4 pt-4 text-lg font-semibold md:px-5 md:pt-5">
        Données et confidentialité
      </h2>
      <div className="grid divide-y divide-line">
        <LinkRow href="/reglages/donnees" icon={<DownloadSimpleIcon size={18} weight="bold" />} label="Mes données" detail="Tout récupérer : JSON, CSV et photos" />
        <LinkRow href="/confidentialite" icon={<ShieldCheckIcon size={18} weight="bold" />} label="Confidentialité" detail="Ce que Fonte garde et qui peut le lire" />
        <LinkRow href="/reglages/supprimer" icon={<TrashIcon size={18} weight="bold" />} label="Supprimer mon compte" detail="Toutes tes données et tes photos" danger />
      </div>
    </section>
  );
}
