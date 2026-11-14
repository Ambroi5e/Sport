import type { Metadata } from "next";
import { BudgetSummary } from "@/components/groceries/budget-card";
import { BudgetForm, PurchaseForm } from "@/components/groceries/budget-forms";
import { DayCostCard } from "@/components/groceries/day-cost-card";
import { PurchaseList } from "@/components/groceries/purchase-list";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/dates";
import { budgetStatus, dayCost } from "@/lib/engine";
import { addPurchase, deletePurchase, setBudget } from "../actions";
import { getEaten, getPrices, getPurchases } from "../data";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  const profile = (await getProfile())!;
  const today = localDate(profile.timezone);
  const monday = weekStart(today);
  const [purchases, eaten, prices] = await Promise.all([getPurchases(addDays(monday, -28)), getEaten(today), getPrices()]);
  const budget = profile.weekly_food_budget === null ? null : Number(profile.weekly_food_budget);

  return (
    <>
      <PageHeader title="Budget" eyebrow="Courses" back="/courses" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-6">
        <div className="grid gap-4">
          <Card className="grid gap-5">
            <BudgetSummary budget={budget} status={budgetStatus(budget, purchases, monday)} />
            <BudgetForm budget={budget} action={setBudget} />
          </Card>
          <DayCostCard cost={dayCost(eaten.ingredients, prices, eaten.days)} days={eaten.days} pricesHref="/courses/prix" />
        </div>
        <div className="grid gap-4">
          <Card className="grid gap-4">
            <h2 className="text-lg font-semibold">Noter un achat</h2>
            <PurchaseForm today={today} action={addPurchase} />
          </Card>
          <section aria-labelledby="achats-titre" className="grid gap-2">
            <h2 id="achats-titre" className="label-caps">
              Achats des cinq dernières semaines
            </h2>
            <PurchaseList purchases={purchases} deleteAction={deletePurchase} />
          </section>
        </div>
      </div>
    </>
  );
}
