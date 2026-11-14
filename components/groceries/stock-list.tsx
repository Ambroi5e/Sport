import { PackageIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { expiryOf } from "@/lib/engine";
import { expiryLabel, type StockItem } from "@/lib/groceries";

/**
 * Le stock, le plus urgent en haut. La péremption est toujours écrite en mots ;
 * la couleur ne fait que la souligner. « Fini » retire l'article en un tap.
 */
export function StockList({
  items,
  today,
  itemHref,
  finishAction,
}: {
  items: StockItem[];
  today: string;
  itemHref: (id: string) => string;
  finishAction: (id: string) => Promise<void>;
}) {
  if (!items.length) {
    return (
      <EmptyState icon={<PackageIcon size={22} />} title="Ton stock est vide">
        Après les courses, « Ranger dans mon stock » y met les articles cochés. Tu peux aussi écrire ici ce que tu as déjà dans tes placards.
      </EmptyState>
    );
  }
  return (
    <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
      {items.map((item) => {
        const expiry = expiryOf(item.expiresOn, today);
        const label = expiryLabel(expiry, item.expiresOn);
        return (
          <li key={item.id} className="flex items-center gap-1 pr-2">
            <Link href={itemHref(item.id)} className="min-w-0 flex-1 px-4 py-3 hover:bg-surface-2">
              <span className="block truncate text-[15px] font-medium">{item.name}</span>
              <span className="block text-[13px] text-muted">
                {item.quantity ? `${item.quantity}${label ? " · " : ""}` : ""}
                {label ? (
                  <span className={cn(expiry.state === "perime" && "font-medium text-danger", expiry.state === "bientot" && "font-medium text-text")}>{label}</span>
                ) : item.quantity ? null : (
                  "Sans date"
                )}
              </span>
            </Link>
            <form action={finishAction.bind(null, item.id)}>
              <SubmitButton variant="secondary" className="h-11 shrink-0 px-3 text-[14px]" aria-label={`${item.name} : fini, retirer du stock`}>
                Fini
              </SubmitButton>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
