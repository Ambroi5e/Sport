"use client";

import { useActionState, useState } from "react";
import type { ReminderState } from "@/app/(app)/reglages/rappels/actions";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { REMINDER_KINDS, REMINDERS, WEEKDAYS, type ReminderKind, type ReminderSettings } from "@/lib/reminders";

type Action = (state: ReminderState, formData: FormData) => Promise<ReminderState>;

/** Les quatre rappels : un interrupteur et une heure chacun, les jours pour la séance. */
export function RemindersForm({ settings, action }: { settings: ReminderSettings; action: Action }) {
  const [state, formAction] = useActionState(action, {} as ReminderState);
  const [on, setOn] = useState<Record<ReminderKind, boolean>>(() => Object.fromEntries(REMINDER_KINDS.map((k) => [k, settings.times[k] !== null])) as Record<ReminderKind, boolean>);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <ul className="grid divide-y divide-line">
        {REMINDER_KINDS.map((kind) => {
          const info = REMINDERS[kind];
          return (
            <li key={kind} className="grid gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <label htmlFor={`actif-${kind}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-[15px] font-medium">{info.label}</span>
                  <span className="block text-[13px] text-muted">{info.hint}</span>
                </label>
                <span className="relative inline-flex shrink-0">
                  <input
                    id={`actif-${kind}`}
                    name={`actif-${kind}`}
                    type="checkbox"
                    role="switch"
                    aria-checked={on[kind]}
                    checked={on[kind]}
                    onChange={(e) => setOn((current) => ({ ...current, [kind]: e.target.checked }))}
                    className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative h-7 w-12 rounded-full border transition-colors duration-[120ms] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text",
                      on[kind] ? "border-accent bg-accent" : "border-line bg-surface-2",
                    )}
                  >
                    <span className={cn("absolute top-0.5 size-[22px] rounded-full transition-[left] duration-[120ms]", on[kind] ? "left-[22px] bg-on-accent" : "left-0.5 bg-muted")} />
                  </span>
                </span>
              </div>
              {on[kind] ? (
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <label htmlFor={`heure-${kind}`} className="text-sm font-medium">
                      Heure
                    </label>
                    <input
                      id={`heure-${kind}`}
                      name={`heure-${kind}`}
                      type="time"
                      step={300}
                      required
                      defaultValue={settings.times[kind] ?? info.defaultTime}
                      className="font-numeric h-12 rounded-control border border-line bg-surface-2 px-3 text-base text-text focus:border-accent focus:outline-none"
                    />
                  </div>
                  {kind === "seance" ? (
                    <fieldset className="grid gap-2">
                      <legend className="mb-1.5 text-sm font-medium">Jours</legend>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => (
                          <label key={day.value}>
                            <input type="checkbox" name="jour" value={day.value} defaultChecked={settings.workoutDays.includes(day.value)} className="peer sr-only" />
                            <span
                              className={cn(
                                "flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-2 px-3 text-sm font-medium text-muted transition-colors",
                                "peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-text",
                                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text",
                              )}
                            >
                              {day.short}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="grid gap-2">
        <SubmitButton size="lg" className="w-full sm:w-auto sm:justify-self-start" pendingLabel="Enregistrement…">
          Enregistrer
        </SubmitButton>
        <p role={state.error ? "alert" : "status"} className={cn("min-h-5 text-[14px]", state.error ? "text-danger" : "text-muted")}>
          {state.error ?? state.saved ?? ""}
        </p>
      </div>
    </form>
  );
}
