import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HyroxForm } from "@/components/training/hyrox-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { formatLongDate, localDate } from "@/lib/dates";
import { deleteHyrox, saveHyrox } from "../actions";
import { getHyroxRace } from "../data";

export const metadata: Metadata = { title: "Course Hyrox" };

export default async function HyroxRacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [profile, race] = await Promise.all([getProfile(), getHyroxRace(id)]);
  if (!race) notFound();
  return (
    <>
      <PageHeader title="Course Hyrox" eyebrow={formatLongDate(race.date)} back="/entrainement/hyrox" />
      <div className="grid gap-6 md:max-w-3xl">
        <HyroxForm action={saveHyrox.bind(null, race.id)} defaults={{ date: race.date, seconds: race.seconds, splits: race.splits }} today={localDate(profile!.timezone)} />
        <ConfirmAction
          action={deleteHyrox.bind(null, race.id)}
          label="Supprimer cette course"
          confirmLabel="Supprimer"
          question={`Supprimer la course Hyrox du ${formatLongDate(race.date)} ?`}
        />
      </div>
    </>
  );
}
