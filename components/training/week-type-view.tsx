import { TrashIcon } from "@phosphor-icons/react/ssr";
import type { WeeklySportState } from "@/app/(app)/entrainement/semaine/actions";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Intensity } from "@/lib/engine";
import { capitalize, sportName, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/planning";
import { formatMinutes, INTENSITY_LABELS, isSport, type Sport } from "@/lib/sports";
import { SportIcon } from "./sport-icon";
import { WeeklySportForm } from "./weekly-sport-form";

export type WeeklySportRow = { id: string; weekday: number; sport: string; label: string | null; minutes: number; intensity: Intensity };

/** Semaine type : les jours disponibles pour la musculation et les sports qui reviennent chaque semaine. */
export function WeekTypeView({
  availableDays,
  weeklySports,
  sports,
  defaults,
  saveDaysAction,
  addSportAction,
  deleteSportAction,
}: {
  availableDays: readonly number[];
  weeklySports: WeeklySportRow[];
  sports: Sport[];
  defaults: { sport: Sport; minutes: number; intensity: Intensity };
  saveDaysAction: (formData: FormData) => void | Promise<void>;
  addSportAction: (state: WeeklySportState, formData: FormData) => Promise<WeeklySportState>;
  deleteSportAction: (id: string) => () => void | Promise<void>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="grid content-start gap-4">
        <Card aria-labelledby="jours-dispo-titre">
          <form action={saveDaysAction} className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend id="jours-dispo-titre" className="mb-1.5 text-lg font-semibold">
                Jours disponibles pour la musculation
              </legend>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_SHORT.map((short, i) => (
                  <label key={short}>
                    <input type="checkbox" name="days" value={i + 1} defaultChecked={availableDays.includes(i + 1)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className="flex h-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface-2 text-[14px] font-medium text-muted transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text"
                    >
                      {short}
                    </span>
                    <span className="sr-only">{WEEKDAY_NAMES[i]}</span>
                  </label>
                ))}
              </div>
              <p className="text-[13px] text-muted">
                Coche plus de jours que de séances : le planning a de quoi espacer les séances et en replacer une ratée. Aucun jour coché : tous les jours
                conviennent. Ces jours servent aussi à tes cibles de nutrition des jours d&apos;entraînement.
              </p>
            </fieldset>
            <SubmitButton className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Enregistrement…">
              Enregistrer les jours
            </SubmitButton>
          </form>
        </Card>

        <section aria-labelledby="sports-fixes-titre" className="grid gap-2">
          <h2 id="sports-fixes-titre" className="label-caps">
            Sports fixes
          </h2>
          {weeklySports.length ? (
            <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
              {weeklySports.map((w) => {
                const name = sportName(w.sport, w.label);
                return (
                  <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text">
                      <SportIcon sport={isSport(w.sport) ? w.sport : "autre"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {capitalize(WEEKDAY_NAMES[w.weekday - 1])} : {name}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {formatMinutes(w.minutes)} · {INTENSITY_LABELS[w.intensity].label.toLowerCase()}
                      </span>
                    </span>
                    <form action={deleteSportAction(w.id)}>
                      <SubmitButton variant="ghost" aria-label={`Retirer ${name} du ${WEEKDAY_NAMES[w.weekday - 1]}`} className="w-12 px-0 text-muted" pendingLabel="…">
                        <TrashIcon size={20} aria-hidden="true" />
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-control border border-dashed border-line p-4 text-[15px] text-muted">
              Aucun sport fixe. Ajoute ceux qui reviennent chaque semaine (le padel du mercredi, le foot du dimanche) : le planning en tient compte avant
              même que tu les notes.
            </p>
          )}
        </section>
      </div>

      <Card aria-labelledby="ajout-sport-titre" className="grid content-start gap-4">
        <h2 id="ajout-sport-titre" className="text-lg font-semibold">
          Ajouter un sport fixe
        </h2>
        <WeeklySportForm action={addSportAction} sports={sports} defaults={defaults} />
      </Card>
    </div>
  );
}
