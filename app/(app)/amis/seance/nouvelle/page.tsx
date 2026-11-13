import { UsersThreeIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupForm } from "@/components/friends/group-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getFriends } from "../../data";
import { createGroupSession } from "../actions";

export const metadata: Metadata = { title: "Séance commune" };

export default async function NewGroupSessionPage() {
  const friends = await getFriends();
  return (
    <>
      <PageHeader back="/amis" eyebrow="Amis" title="Séance commune" />
      <div className="md:max-w-xl">
        {friends.length ? (
          <Card>
            <GroupForm friends={friends.map((f) => ({ id: f.id, name: f.name }))} action={createGroupSession} />
          </Card>
        ) : (
          <EmptyState icon={<UsersThreeIcon size={22} />} title="Il faut d'abord un ami">
            Une séance commune se fait avec des amis.{" "}
            <Link href="/amis" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Ajouter un ami
            </Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
