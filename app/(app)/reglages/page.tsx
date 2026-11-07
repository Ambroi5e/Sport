import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile, isAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import { setTheme, setWeightUnit } from "./actions";

export const metadata: Metadata = { title: "Réglages" };

function Segmented({ name, value, options, action }: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex rounded-[6px] border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="submit"
          name={name}
          value={o.value}
          aria-pressed={value === o.value}
          className={cn("h-10 flex-1 rounded-[4px] px-4 text-sm font-semibold", value === o.value ? "bg-accent text-on-accent" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </form>
  );
}

export default async function SettingsPage() {
  const [profile, admin] = await Promise.all([getProfile(), isAdmin()]);
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <>
      <PageHeader title="Réglages" back="/" />
      <div className="grid gap-4 md:max-w-xl">
        <Card className="grid gap-4">
          <h2 className="text-lg font-semibold">Affichage</h2>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Thème</p>
            <Segmented name="theme" value={theme} action={setTheme} options={[{ value: "dark", label: "Sombre" }, { value: "light", label: "Clair" }]} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Unité de poids</p>
            <Segmented name="unit" value={profile?.weight_unit ?? "kg"} action={setWeightUnit} options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} />
          </div>
        </Card>

        {admin ? (
          <Link href="/admin" className="rounded-[6px] border border-line bg-surface p-4 font-medium hover:bg-surface-2">
            Administration : codes d&apos;invitation
          </Link>
        ) : null}

        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full">
            Me déconnecter
          </Button>
        </form>
      </div>
    </>
  );
}
