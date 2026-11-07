import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { StylePicker } from "@/components/settings/style-picker";
import { PageHeader } from "@/components/ui/page-header";
import { getAppearance } from "@/lib/appearance";
import { getProfile, isAdmin } from "@/lib/auth";
import { setTheme, setWeightUnit } from "./actions";

export const metadata: Metadata = { title: "Réglages" };

function Segmented({ name, label, value, options, action }: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} aria-label={label} className="flex rounded-control border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="submit"
          name={name}
          value={o.value}
          aria-pressed={value === o.value}
          className={cn("h-10 flex-1 rounded-inner px-4 text-sm font-semibold", value === o.value ? "bg-accent text-on-accent" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </form>
  );
}

export default async function SettingsPage() {
  const [profile, admin, appearance] = await Promise.all([getProfile(), isAdmin(), getAppearance()]);
  const unit = profile?.weight_unit === "lb" ? "lb" : "kg";

  return (
    <>
      <PageHeader title="Réglages" back="/" />
      <div className="grid gap-4 md:max-w-xl">
        <Card aria-labelledby="style-titre" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="style-titre" className="text-lg font-semibold">
              Style
            </h2>
            <p className="text-[15px] text-muted">Couleurs, polices et formes de l&apos;app. Le choix vaut pour cet appareil.</p>
          </div>
          <StylePicker current={appearance.style} theme={appearance.theme} unit={unit} />
        </Card>

        <Card aria-labelledby="affichage-titre" className="grid gap-4">
          <h2 id="affichage-titre" className="text-lg font-semibold">
            Affichage
          </h2>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Thème</p>
            <Segmented
              name="theme"
              label="Thème"
              value={appearance.theme}
              action={setTheme}
              options={[{ value: "dark", label: "Sombre" }, { value: "light", label: "Clair" }]}
            />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Unité de poids</p>
            <Segmented
              name="unit"
              label="Unité de poids"
              value={unit}
              action={setWeightUnit}
              options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]}
            />
          </div>
        </Card>

        {admin ? (
          <Link href="/admin" className="rounded-control border border-line bg-surface p-4 font-medium hover:bg-surface-2">
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
