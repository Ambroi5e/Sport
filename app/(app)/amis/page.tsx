import type { Metadata } from "next";
import { FriendsView } from "@/components/friends/friends-view";
import { PageHeader } from "@/components/ui/page-header";
import { acceptFriendInvite, createFriendInvite } from "./actions";
import { getFriends } from "./data";

export const metadata: Metadata = { title: "Amis" };

export default async function FriendsPage() {
  const friends = await getFriends();
  return (
    <>
      <PageHeader back="/" title="Amis" />
      <FriendsView friends={friends} friendHref={(id) => `/amis/${id}`} inviteAction={createFriendInvite} acceptAction={acceptFriendInvite} />
    </>
  );
}
