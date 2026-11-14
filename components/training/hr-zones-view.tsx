import type { HeartRateFormState } from "@/app/(app)/entrainement/endurance/zones/actions";
import { Card } from "@/components/ui/card";
import { estimatedHrMax, hrZones, hrZoneTime, type Outing } from "@/lib/engine";
import { HR_ZONE_LABELS } from "@/lib/races";
import { formatMinutes } from "@/lib/sports";
import { HeartRateForm } from "./heart-rate-form";

const WEEKS = 8;

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Zones cardiaques : les deux fréquences à noter, les cinq zones qui en découlent,
 * et le temps passé dans chacune sur huit semaines d'après la moyenne de chaque sortie.
 */
export function HrZonesView({
  hrMax,
  hrRest,
  birthYear,
  outings,
  today,
  action,
}: {
  hrMax: number | null;
  hrRest: number | null;
  birthYear: number | null;
  outings: Outing[];
  today: string;
  action: (state: HeartRateFormState, formData: FormData) => Promise<HeartRateFormState>;
}) {
  const estimate = birthYear ? estimatedHrMax(Number(today.slice(0, 4)) - birthYear) : null;
  const max = hrMax ?? estimate;
  const zones = max ? hrZones(max, hrRest) : null;
  const time = zones ? hrZoneTime(outings, zones, shift(today, -7 * WEEKS)) : [];
  const total = time.reduce((sum, s) => sum + s, 0);
  const longest = Math.max(...time, 1);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
      <div className="grid content-start gap-4">
        <Card aria-labelledby="fc-titre" className="grid gap-3">
          <h2 id="fc-titre" className="text-lg font-semibold">
            Tes fréquences
          </h2>
          <HeartRateForm action={action} hrMax={hrMax} hrRest={hrRest} estimate={estimate} />
        </Card>
        <p className="text-[13px] text-muted">
          Des repères généraux, pas un avis médical. Douleur dans la poitrine, malaise ou essoufflement inhabituel : arrête l&apos;effort et consulte un médecin.
          Avant de reprendre un entraînement intense après une longue pause ou avec un problème de santé, demande-lui son avis.
        </p>
      </div>

      <Card aria-labelledby="zones-titre" className="grid content-start gap-3">
        <div>
          <h2 id="zones-titre" className="text-lg font-semibold">
            Tes cinq zones
          </h2>
          {zones ? (
            <p className="text-[14px] text-muted">
              {hrMax ? `Fréquence maximale notée : ${hrMax} bpm.` : `Fréquence maximale estimée par l'âge : ${max} bpm (208 − 0,7 × âge). L'écart d'une personne à l'autre dépasse souvent 10 battements : note la tienne si tu la connais.`}{" "}
              {hrRest ? `Zones calculées sur ta réserve (entre ${hrRest} et ${max} bpm).` : "Zones en pourcentage de la fréquence maximale."}
            </p>
          ) : null}
        </div>
        {zones ? (
          <>
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Zones cardiaques et temps passé dans chacune sur {WEEKS} semaines</caption>
              <thead>
                <tr className="text-[13px] text-muted">
                  <th scope="col" className="py-1.5 font-medium">
                    Zone
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Battements
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    {WEEKS} semaines
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {zones.map((z, i) => (
                  <tr key={z.zone} className="align-top">
                    <th scope="row" className="py-2.5 pr-2 font-normal">
                      <span className="font-numeric text-[18px]">Z{z.zone}</span>
                      <span className="block text-[13px] text-muted">{HR_ZONE_LABELS[i]}</span>
                    </th>
                    <td className="font-numeric py-2.5 pr-2 text-[18px] whitespace-nowrap">
                      {z.from} à {z.to}
                    </td>
                    <td className="w-2/5 py-2.5 text-right">
                      <span className="font-numeric block text-[18px]">{time[z.zone] ? formatMinutes(Math.round(time[z.zone] / 60)) : "0"}</span>
                      <span className="mt-1 flex h-1.5 justify-end" aria-hidden="true">
                        {time[z.zone] ? <span className="rounded-inner bg-accent" style={{ width: `${Math.max(4, (time[z.zone] / longest) * 100)}%` }} /> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[13px] text-muted">
              {total > 0
                ? `Chaque sortie compte en entier dans la zone de sa fréquence moyenne${time[0] ? ` (${formatMinutes(Math.round(time[0] / 60))} sous la zone 1 ne sont pas montrées)` : ""} : Fonte n'a pas le détail seconde par seconde.`
                : "Note la fréquence cardiaque moyenne d'une sortie (sous « Plus de détails ») pour voir le temps passé dans chaque zone."}
            </p>
          </>
        ) : (
          <p className="text-[15px] text-muted">Note ta fréquence maximale pour voir tes zones. Sans elle, Fonte peut l&apos;estimer si ton année de naissance est dans ton profil.</p>
        )}
      </Card>
    </div>
  );
}
