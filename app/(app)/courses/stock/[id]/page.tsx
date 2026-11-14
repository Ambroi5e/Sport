import type { Metadata } from "next";
import { StockItemForm } from "@/components/groceries/stock-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateStockItem } from "../../actions";
import { getStockItem } from "../../data";

export const metadata: Metadata = { title: "Article du stock" };

export default async function StockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getStockItem(id);
  return (
    <>
      <PageHeader title={item.name} eyebrow="Mon stock" back="/courses/stock" />
      <div className="md:max-w-xl">
        <StockItemForm item={item} action={updateStockItem.bind(null, item.id)} />
      </div>
    </>
  );
}
