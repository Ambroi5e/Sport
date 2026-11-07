import { ImageBrokenIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/components/ui/cn";

/**
 * Photo privée affichée par son lien signé (10 minutes). Pas de next/image :
 * l'optimiseur mettrait en cache une copie hors du bucket privé.
 */
export function PhotoImage({ url, alt, className, eager }: { url: string | null; alt: string; className?: string; eager?: boolean }) {
  if (!url) {
    return (
      <span role="img" aria-label={`${alt} (indisponible)`} className={cn("grid place-items-center bg-surface-2 text-muted", className)}>
        <ImageBrokenIcon size={28} aria-hidden="true" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- lien signé de courte durée, voir ci-dessus
    <img src={url} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className={cn("bg-surface-2 object-cover", className)} />
  );
}
