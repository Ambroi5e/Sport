import { CaretRightIcon, CookieIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatKcal, formatMacro } from "@/lib/nutrition";
import { getPersonalFoods } from "../data";

export const metadata: Metadata = { title: "Mes aliments" };

export default async function PersonalFoodsPage() {
  const foods = await getPersonalFoods();
  return (
    <>
      <PageHeader title="Mes aliments" back="/nutrition" />
      <div className="grid gap-4 md:max-w-xl">
        {foods.length ? (
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {foods.map((f) => (
              <li key={f.id}>
                <Link href={`/nutrition/aliments/${f.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{f.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {f.brand ? `${f.brand} · ` : ""}
                      {formatKcal(f.per100.kcal)} kcal · {formatMacro(f.per100.proteinG)} g prot. pour 100 g
                    </span>
                  </span>
                  <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CookieIcon size={22} />} title="Aucun aliment perso pour l'instant">
            Le catalogue couvre les aliments de base. Pour un produit précis (ta whey, ton granola), crée-le avec les valeurs pour 100 g de
            l&apos;étiquette.
          </EmptyState>
        )}
        <Link href="/nutrition/aliments/nouveau" className={buttonClasses("secondary", "md", "w-full")}>
          <PlusIcon size={18} weight="bold" aria-hidden="true" /> Créer un aliment
        </Link>
      </div>
    </>
  );
}
