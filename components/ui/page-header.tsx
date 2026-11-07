import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * En-tête d'écran. `back` affiche la flèche retour (tout écran qui n'est pas
 * un onglet racine). `action` se place à droite.
 */
export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: string;
  eyebrow?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 pb-4 pt-2 md:pb-6 md:pt-4">
      {back ? (
        <Link
          href={back}
          aria-label="Retour"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface-2"
        >
          <ArrowLeftIcon size={20} weight="bold" aria-hidden="true" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
        <h1 className="font-title truncate text-[28px] md:text-[34px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}
