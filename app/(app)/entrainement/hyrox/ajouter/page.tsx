import type { Metadata } from "next";
import { HyroxForm } from "@/components/training/hyrox-form";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { saveHyrox } from "../actions";

export const metadata: Metadata = { title: "Noter une course Hyrox" };

export default async function AddHyroxPage() {
  const profile = await getProfile();
  const today = localDate(profile!.timezone);
  return (
    <>
      <PageHeader title="Noter une course Hyrox" back="/entrainement/hyrox" />
      <div className="md:max-w-3xl">
        <HyroxForm action={saveHyrox.bind(null, null)} defaults={{ date: today, seconds: null, splits: null }} today={today} />
      </div>
    </>
  );
}
