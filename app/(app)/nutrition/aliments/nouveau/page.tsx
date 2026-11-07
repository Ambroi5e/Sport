import { BarcodeIcon, CameraIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { FoodForm } from "@/components/nutrition/food-form";
import { PageHeader } from "@/components/ui/page-header";
import { createFood } from "../../actions";
import { creationContext } from "../../context";

export const metadata: Metadata = { title: "Nouvel aliment" };

/** Venu de l'ajout d'un repas, on enchaîne ensuite sur la quantité. */
export default async function NewFoodPage({ searchParams }: { searchParams: Promise<{ repas?: string; jour?: string; nom?: string }> }) {
  const search = await searchParams;
  const ctx = await creationContext(search);
  const suffix = ctx.query ? `?${ctx.query}` : "";
  return (
    <>
      <PageHeader title="Nouvel aliment" back={ctx.back} />
      <div className="grid gap-5 md:max-w-xl">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/nutrition/scanner${suffix}`} className={shortcut}>
            <BarcodeIcon size={20} aria-hidden="true" /> Scanner le code
          </Link>
          <Link href={`/nutrition/etiquette${suffix}`} className={shortcut}>
            <CameraIcon size={20} aria-hidden="true" /> Lire l&apos;étiquette
          </Link>
        </div>
        <FoodForm action={createFood} defaultName={search.nom?.slice(0, 80)} hidden={ctx.hidden} submitLabel={ctx.submitLabel} />
      </div>
    </>
  );
}

const shortcut =
  "flex min-h-12 items-center justify-center gap-2 rounded-control border border-line bg-surface-2 px-3 text-center text-[15px] font-medium hover:bg-line/60";
