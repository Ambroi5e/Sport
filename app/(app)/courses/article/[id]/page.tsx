import type { Metadata } from "next";
import { ItemForm } from "@/components/groceries/item-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { deleteItem, updateItem } from "../../actions";
import { getShoppingItem } from "../../data";

export const metadata: Metadata = { title: "Article" };

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getShoppingItem(id);
  return (
    <>
      <PageHeader title={item.name} eyebrow="Courses" back="/courses" />
      <div className="grid gap-6 md:max-w-xl">
        <ItemForm item={item} action={updateItem.bind(null, item.id)} />
        <div className="justify-self-start">
          <ConfirmAction action={deleteItem.bind(null, item.id)} label="Retirer de la liste" confirmLabel="Retirer" question={`Retirer « ${item.name} » de la liste ?`} />
        </div>
      </div>
    </>
  );
}
