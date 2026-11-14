import type { Metadata } from "next";
import { EnduranceView } from "@/components/training/endurance-view";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { localDate } from "@/lib/dates";
import { ENDURANCE_SPORTS, isEndurance } from "@/lib/engine";
import { getOutings } from "../sports/data";

export const metadata: Metadata = { title: "Endurance" };

/** Le sport montré : celui de l'adresse, sinon celui de la sortie la plus récente. */
export default async function EndurancePage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const [{ sport: asked }, profile] = await Promise.all([searchParams, getProfile()]);
  const today = localDate(profile!.timezone);
  const outings = await getOutings(today);
  const latest = outings[0]?.sport;
  const sport = asked && isEndurance(asked) && outings.some((o) => o.sport === asked) ? asked : latest && isEndurance(latest) ? latest : ENDURANCE_SPORTS[0];
  return (
    <>
      <PageHeader title="Endurance" back="/entrainement" />
      <EnduranceView
        outings={outings}
        sport={sport}
        today={today}
        addHref="/entrainement/sports/ajouter"
        sportHref={(s) => `/entrainement/endurance?sport=${s}`}
        outingHref={(id) => `/entrainement/sports/${id}`}
        links={[
          { href: "/entrainement/endurance/objectifs", label: "Objectifs de course" },
          { href: "/entrainement/endurance/zones", label: "Zones cardiaques" },
        ]}
      />
    </>
  );
}
