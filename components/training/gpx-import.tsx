"use client";

import { FileArrowUpIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { ActivityFormState } from "@/app/(app)/entrainement/sports/actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addDays, formatLongDate, localDate } from "@/lib/dates";
import { GPX_MAX_BYTES, paceOf, readGpx, type GpxSummary } from "@/lib/engine";
import { formatDistance, formatDuration, formatPace, MIN_DURATION, type Sport } from "@/lib/sports";
import { ActivityForm } from "./activity-form";

/**
 * Importer une sortie : le fichier GPX est lu ici, dans le navigateur. Il préremplit
 * le formulaire habituel ; seuls les totaux partent à l'enregistrement, jamais la trace.
 */
export function GpxImport({
  action,
  sports,
  today,
  timeZone,
  weightKg,
  initial = null,
}: {
  action: (state: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  sports: Sport[];
  today: string;
  timeZone: string;
  weightKg: number | null;
  /** Résumé déjà lu, pour l'aperçu. */
  initial?: { name: string; summary: GpxSummary } | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function read(picked: File | undefined) {
    if (!picked) return;
    setError(null);
    if (picked.size > GPX_MAX_BYTES) return setError("Ce fichier dépasse 20 Mo. Exporte une seule sortie à la fois.");
    const summary = readGpx(await picked.text());
    if (!summary) return setError("Fonte n'a pas trouvé de trace dans ce fichier. Vérifie que c'est bien un export GPX d'une sortie.");
    setFile({ name: picked.name, summary });
  }

  const s = file?.summary ?? null;
  const sport = s?.sport ?? "course";
  const day = s?.startedAt ? localDate(timeZone, new Date(s.startedAt)) : today;
  const tooOld = day < addDays(today, -730) || day > today;
  const pace = s?.seconds ? paceOf(sport, s.distanceM, s.seconds) : null;

  return (
    <div className="grid gap-6">
      <Card aria-labelledby="gpx-titre" className="grid gap-3">
        <h2 id="gpx-titre" className="text-lg font-semibold">
          {file ? file.name : "Choisis un fichier GPX"}
        </h2>
        {s ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Total label="Distance" value={formatDistance(s.distanceM, sport)} />
              <Total label="Temps en mouvement" value={s.seconds ? formatDuration(s.seconds) : "Inconnu"} />
              <Total label="Dénivelé positif" value={s.elevationM === null ? "Inconnu" : `${new Intl.NumberFormat("fr-FR").format(s.elevationM)} m`} />
              <Total label="Fréquence moyenne" value={s.avgHr === null ? "Inconnue" : `${s.avgHr} bpm`} />
            </dl>
            <p className="text-[14px] text-muted">
              {s.startedAt ? `Sortie du ${formatLongDate(day)}` : "Fichier sans date : choisis le jour plus bas"}
              {pace ? `, ${formatPace(pace)}` : ""}. {new Intl.NumberFormat("fr-FR").format(s.points)} points lus sur cet appareil.
            </p>
            {tooOld ? <p className="text-[14px] text-muted">Cette sortie a plus de deux ans ou une date à venir : choisis le jour dans le formulaire.</p> : null}
            {s.seconds !== null && s.seconds < MIN_DURATION * 60 ? (
              <p className="text-[14px] text-muted">Cette trace dure moins de {MIN_DURATION} minutes, la durée minimale d&apos;une activité : corrige la durée avant d&apos;enregistrer.</p>
            ) : null}
          </>
        ) : (
          <p className="text-[15px] text-muted">
            Exporte ta sortie depuis ta montre ou ton app (Garmin, Coros, Suunto, Strava, Komoot…) au format GPX. Fonte en tire la date, la distance, la durée, le
            dénivelé et la fréquence cardiaque moyenne.
          </p>
        )}
        <input ref={input} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => read(e.target.files?.[0])} />
        <button type="button" onClick={() => input.current?.click()} className={buttonClasses(file ? "secondary" : "primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
          <FileArrowUpIcon size={20} aria-hidden="true" /> {file ? "Choisir un autre fichier" : "Choisir un fichier"}
        </button>
        {error ? (
          <p role="alert" className="text-[14px] text-danger">
            {error}
          </p>
        ) : null}
        <p className="text-[13px] text-muted">
          Le fichier reste sur ton appareil : la trace GPS n&apos;est ni envoyée ni gardée. Seuls les totaux sont enregistrés, quand tu valides. Si cette sortie est
          déjà notée, corrige-la plutôt que de l&apos;importer une seconde fois.
        </p>
      </Card>

      {s && file ? (
        <section aria-labelledby="gpx-verifier-titre" className="grid gap-4">
          <h2 id="gpx-verifier-titre" className="text-lg font-semibold">
            Vérifie, puis enregistre
          </h2>
          <ActivityForm
            key={`${file.name}-${s.startedAt}-${s.distanceM}`}
            action={action}
            defaults={{
              sport,
              label: "",
              minutes: s.seconds ? Math.floor(s.seconds / 60) : 60,
              intensity: "moderee",
              date: tooOld ? today : day,
              distanceM: s.distanceM >= 50 ? s.distanceM : null,
              extraSeconds: s.seconds ? s.seconds % 60 : 0,
              elevationM: s.elevationM,
              avgHr: s.avgHr,
            }}
            sports={sports}
            today={today}
            weightKg={weightKg}
          />
        </section>
      ) : null}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-numeric text-[22px]">{value}</dd>
    </div>
  );
}
