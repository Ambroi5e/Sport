import type { Metadata } from "next";
import { FriendsView } from "@/components/friends/friends-view";
import { PageHeader } from "@/components/ui/page-header";
import { acceptFriendInvite, createFriendInvite } from "./actions";
import { getFriends } from "./data";
import { getLiveGroupSessions } from "./seance/data";

export const metadata: Metadata = { title: "Amis" };

export default async function FriendsPage() {
  const [friends, sessions] = await Promise.all([getFriends(), getLiveGroupSessions()]);
  return (
    <>
      <PageHeader back="/" title="Amis" />
      <FriendsView friends={friends} friendHref={(id) => `/amis/${id}`}
        sessions={sessions}
        groupHref={(id) => `/amis/seance/${id}`}
        newGroupHref="/amis/seance/nouvelle" inviteAction={createFriendInvite} acceptAction={acceptFriendInvite} />
    </>
  );
}
