import { TrashIcon } from "@phosphor-icons/react/ssr";
import { formatShortDate } from "@/lib/dates";
import { formatEuros, type Purchase } from "@/lib/groceries";

/** Achats notés, du plus récent au plus ancien ; la corbeille retire une ligne saisie par erreur. */
export function PurchaseList({ purchases, deleteAction }: { purchases: Purchase[]; deleteAction: (id: string) => Promise<void> }) {
  if (!purchases.length) return <p className="text-[14px] text-muted">Aucun achat noté ces dernières semaines.</p>;
  return (
    <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
      {purchases.map((p) => (
        <li key={p.id} className="flex min-h-14 items-center gap-3 pl-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{p.store ?? "Courses"}</span>
            <span className="block text-[13px] text-muted">{formatShortDate(p.on)}</span>
          </span>
          <span className="font-numeric shrink-0 text-[17px]">{formatEuros(p.amount)}</span>
          <form action={deleteAction.bind(null, p.id)}>
            <button
              type="submit"
              aria-label={`Retirer l'achat de ${formatEuros(p.amount)} du ${formatShortDate(p.on)}`}
              className="grid size-12 place-items-center text-muted transition-colors hover:text-danger"
            >
              <TrashIcon size={18} aria-hidden="true" />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
