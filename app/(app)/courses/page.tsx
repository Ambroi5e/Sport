import { ShoppingCartIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Courses" };

export default function GroceriesPage() {
  return (
    <>
      <PageHeader title="Courses" />
      <EmptyState icon={<ShoppingCartIcon size={22} />} title="La liste de courses arrive plus tard">
        Elle se générera à partir de tes repas, rangée par rayon, avec ton budget de la semaine et le coût par repas.
      </EmptyState>
    </>
  );
}
