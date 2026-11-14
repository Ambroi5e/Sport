import { CheckIcon, PackageIcon, ShoppingCartIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { RowCheck } from "./row-check";
import { AISLES, listCost } from "@/lib/engine";
import { AISLE_LABELS, formatEuros, itemCost, type ShoppingItem } from "@/lib/groceries";

function Row({ item, itemHref, toggle }: { item: ShoppingItem; itemHref: (id: string) => string; toggle: (id: string, checked: boolean) => Promise<void> }) {
  const cost = itemCost(item);
  return (
    <li className="flex items-center">
      <form action={toggle.bind(null, item.id, !item.checked)}>
        <RowCheck checked={item.checked} label={item.checked ? `Remettre ${item.name} dans la liste` : `Cocher ${item.name}`}>
          <CheckIcon size={16} weight="bold" aria-hidden="true" />
        </RowCheck>
      </form>
      <Link href={itemHref(item.id)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-4 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className={item.checked ? "block truncate text-[15px] text-muted line-through" : "block truncate text-[15px] font-medium"}>{item.name}</span>
          {item.quantity ? <span className="block text-[13px] text-muted">{item.quantity}</span> : null}
        </span>
        {cost !== null && !item.checked ? <span className="font-numeric shrink-0 text-[15px] text-muted">{formatEuros(cost)}</span> : null}
      </Link>
    </li>
  );
}

/**
 * La liste de courses : ce qu'il reste à prendre, rayon par rayon dans l'ordre
 * du magasin, puis le panier (articles cochés) qu'on vide d'un coup.
 */
export function ShoppingList({
  items,
  itemHref,
  toggleAction,
  clearAction,
  storeAction,
}: {
  items: ShoppingItem[];
  itemHref: (id: string) => string;
  toggleAction: (id: string, checked: boolean) => Promise<void>;
  clearAction: () => Promise<void>;
  /** Déplace les articles cochés vers le stock. */
  storeAction: () => Promise<void>;
}) {
  if (!items.length) {
    return (
      <EmptyState icon={<ShoppingCartIcon size={22} />} title="Ta liste est vide">
        Écris un article ci-dessus, ou pars de ce que tu as mangé cette semaine avec « Depuis mes repas ».
      </EmptyState>
    );
  }
  const waiting = items.filter((i) => !i.checked);
  const basket = items.filter((i) => i.checked);
  const cost = listCost(waiting);
  const list = "grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface";

  return (
    <div className="grid gap-5">
      {waiting.length ? (
        <>
          {AISLES.map((aisle) => {
            const rows = waiting.filter((i) => i.aisle === aisle);
            if (!rows.length) return null;
            return (
              <section key={aisle} aria-labelledby={`rayon-${aisle}`} className="grid gap-2">
                <h2 id={`rayon-${aisle}`} className="label-caps">
                  {AISLE_LABELS[aisle]}
                </h2>
                <ul className={list}>
                  {rows.map((item) => (
                    <Row key={item.id} item={item} itemHref={itemHref} toggle={toggleAction} />
                  ))}
                </ul>
              </section>
            );
          })}
          {cost.priced ? (
            <p className="text-[14px] text-muted">
              Total estimé : <span className="font-semibold text-text">{formatEuros(cost.total)}</span>
              {cost.unpriced ? `, sans compter ${cost.unpriced} article${cost.unpriced > 1 ? "s" : ""} dont le prix n'est pas connu.` : "."}
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-control border border-line bg-surface p-4 text-[15px]">Tout est dans le panier. Note le ticket dans Budget, puis range le panier dans ton stock.</p>
      )}

      {basket.length ? (
        <section aria-labelledby="panier-titre" className="grid gap-2">
          <h2 id="panier-titre" className="label-caps">
            Dans le panier ({basket.length})
          </h2>
          <ul className={list}>
            {basket.map((item) => (
              <Row key={item.id} item={item} itemHref={itemHref} toggle={toggleAction} />
            ))}
          </ul>
          <form action={storeAction}>
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Rangement…">
              <PackageIcon size={18} aria-hidden="true" /> Ranger dans mon stock
            </SubmitButton>
          </form>
          <div className="justify-self-start">
            <ConfirmAction
              action={clearAction}
              label="Retirer les articles cochés"
              confirmLabel="Retirer"
              question={`Retirer ${basket.length > 1 ? `les ${basket.length} articles cochés` : "l'article coché"} de la liste ?`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
