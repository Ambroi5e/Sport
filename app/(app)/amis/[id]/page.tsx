import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FriendView } from "@/components/friends/friend-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { removeFriend, setShare } from "../actions";
import { getFriendData, getFriends } from "../data";

export const metadata: Metadata = { title: "Ami" };

export default async function FriendPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bienvenue?: string }> }) {
  const [{ id }, { bienvenue }, friends, profile] = await Promise.all([params, searchParams, getFriends(), getProfile()]);
  const friend = friends.find((f) => f.id === id);
  if (!friend || !profile) notFound();
  const data = await getFriendData(friend);
  return (
    <>
      <PageHeader back="/amis" eyebrow="Ami" title={friend.name} />
      <FriendView
        friend={friend}
        data={data}
        unit={profile.weight_unit === "lb" ? "lb" : "kg"}
        today={localDate(profile.timezone)}
        welcome={bienvenue === "1"}
        shareAction={(category, shown) => setShare.bind(null, friend.id, category, shown)}
        removeAction={removeFriend.bind(null, friend.id)}
      />
    </>
  );
}
