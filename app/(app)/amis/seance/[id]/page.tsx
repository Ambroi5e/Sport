import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GroupBoard } from "@/components/friends/group-board";
import { LiveRefresh } from "@/components/friends/live-refresh";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { getActiveWorkout } from "../../../entrainement/data";
import { endGroupSession, joinGroupSession, leaveGroupSession } from "../actions";
import { getGroupSession } from "../data";

export const metadata: Metadata = { title: "Séance commune" };

export default async function GroupSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [session, profile, active] = await Promise.all([getGroupSession(id), getProfile(), getActiveWorkout()]);
  if (!session) notFound();
  return (
    <>
      <PageHeader back="/amis" eyebrow="Séance commune" title={session.name} />
      {session.live ? <LiveRefresh sessionId={session.id} /> : null}
      <GroupBoard
        session={session}
        unit={profile?.weight_unit === "lb" ? "lb" : "kg"}
        now={Date.now()}
        workoutHref={active ? `/entrainement/seance/${active.id}` : "/entrainement"}
        joinAction={joinGroupSession.bind(null, session.id)}
        leaveAction={leaveGroupSession.bind(null, session.id)}
        endAction={endGroupSession.bind(null, session.id)}
      />
    </>
  );
}
