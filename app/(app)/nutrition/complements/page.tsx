import type { Metadata } from "next";
import { SupplementsView } from "@/components/supplements/supplements-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { toggleTaken } from "./actions";
import { getSupplements } from "./data";

export const metadata: Metadata = { title: "Compléments" };

export default async function SupplementsPage() {
  const profile = (await getProfile())!;
  const supplements = await getSupplements(localDate(profile.timezone), profile.timezone);
  return (
    <>
      <PageHeader title="Compléments" eyebrow="Nutrition" back="/nutrition" />
      <SupplementsView supplements={supplements} editHref={(id) => `/nutrition/complements/${id}`} newHref="/nutrition/complements/nouveau" toggleAction={toggleTaken} />
    </>
  );
}
