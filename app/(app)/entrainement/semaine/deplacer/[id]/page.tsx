import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoveSession } from "@/components/training/move-session";
import { PageHeader } from "@/components/ui/page-header";
import { moveOptions } from "@/lib/engine";
import { moveSession, resetSession } from "../../actions";
import { getWeekContext } from "../../data";

export const metadata: Metadata = { title: "Déplacer une séance" };

export default async function MoveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const week = await getWeekContext();
  const session = week.plan.remaining.find((s) => s.id === id);
  if (!session) notFound();
  return (
    <>
      <PageHeader back="/entrainement/semaine" eyebrow="Déplacer" title={session.name} />
      <div className="md:max-w-xl">
        <MoveSession
          options={moveOptions(week.input, id)}
          today={week.today}
          pinned={week.plan.days.some((d) => d.session?.id === id && d.session.pinned)}
          moveAction={moveSession.bind(null, id)}
          resetAction={resetSession.bind(null, id)}
        />
      </div>
    </>
  );
}
