import { ForkKnifeIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { AddItemForm } from "@/components/groceries/add-item-form";
import { BudgetCard } from "@/components/groceries/budget-card";
import { ShoppingList } from "@/components/groceries/shopping-list";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/dates";
import { budgetStatus } from "@/lib/engine";
import { addItem, clearChecked, toggleItem } from "./actions";
import { getPurchases, getShoppingList } from "./data";

export const metadata: Metadata = { title: "Courses" };

export default async function GroceriesPage() {
  const profile = (await getProfile())!;
  const monday = weekStart(localDate(profile.timezone));
  const [items, purchases] = await Promise.all([getShoppingList(), getPurchases(addDays(monday, -28))]);
  const budget = profile.weekly_food_budget === null ? null : Number(profile.weekly_food_budget);

  return (
    <>
      <PageHeader title="Courses" />
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-6">
        <div className="grid gap-5 md:order-2">
          <BudgetCard budget={budget} status={budgetStatus(budget, purchases, monday)} href="/courses/budget" />
          <AddItemForm action={addItem} />
          <Link href="/courses/repas" className={buttonClasses("secondary", "md", "w-full")}>
            <ForkKnifeIcon size={18} aria-hidden="true" /> Depuis mes repas
          </Link>
        </div>
        <ShoppingList items={items} itemHref={(id) => `/courses/article/${id}`} toggleAction={toggleItem} clearAction={clearChecked} />
      </div>
    </>
  );
}
