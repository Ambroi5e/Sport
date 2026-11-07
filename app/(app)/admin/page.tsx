import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteButton } from "./invite-button";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  if (!(await isAdmin())) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const stats = data?.[0];

  return (
    <>
      <PageHeader title="Administration" back="/reglages" />
      <div className="grid gap-4 md:max-w-xl">
        <p className="text-[15px] text-muted">
          Cette page montre seulement des compteurs. Elle ne donne accès à aucune donnée des utilisateurs.
        </p>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: "Utilisateurs", value: stats?.users },
            { label: "Codes utilisés", value: stats?.invitations_used },
            { label: "Codes actifs", value: stats?.invitations_active },
          ].map((s) => (
            <Card key={s.label} className="grid gap-1 p-3">
              <dt className="text-[12px] text-muted">{s.label}</dt>
              <dd className="font-numeric text-[34px]">{s.value ?? "--"}</dd>
            </Card>
          ))}
        </dl>
        <InviteButton />
      </div>
    </>
  );
}
