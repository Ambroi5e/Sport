import type { Metadata } from "next";
import { AddStockForm } from "@/components/groceries/stock-forms";
import { StockList } from "@/components/groceries/stock-list";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { addStockItem, finishStockItem } from "../actions";
import { getStock } from "../data";

export const metadata: Metadata = { title: "Mon stock" };

export default async function StockPage() {
  const profile = (await getProfile())!;
  const items = await getStock();
  return (
    <>
      <PageHeader title="Mon stock" eyebrow="Courses" back="/courses" />
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
        <StockList items={items} today={localDate(profile.timezone)} itemHref={(id) => `/courses/stock/${id}`} finishAction={finishStockItem} />
        <Card className="grid gap-4">
          <h2 className="text-lg font-semibold">Ajouter au stock</h2>
          <AddStockForm action={addStockItem} />
        </Card>
      </div>
    </>
  );
}
