"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { GOAL_GROUPS, GOALS_WITH_EVENT, type GoalType } from "@/lib/goals";
import { saveOnboarding, type OnboardingState } from "./actions";

function browserTimeZone() {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const STEPS = ["Toi", "Ton objectif", "Ton rythme"] as const;

const FIELD_STEP: Record<string, number> = {
  displayName: 0, birthYear: 0, sex: 0, heightCm: 0, weight: 0, weightUnit: 0,
  goal: 1, level: 1, targetDate: 1,
  sessionsPerWeek: 2,
};

export function OnboardingForm() {
  const [state, action, pending] = useActionState(saveOnboarding, {} as OnboardingState);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [sessions, setSessions] = useState(3);
  const stepRefs = useRef<Array<HTMLFieldSetElement | null>>([]);
  const bad = (f: string) => state.fields?.includes(f) ?? false;

  // Après un refus du serveur, revenir à l'étape du premier champ signalé.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    const first = state.fields?.[0];
    if (first !== undefined && FIELD_STEP[first] !== undefined) setStep(FIELD_STEP[first]);
  }

  function next() {
    const current = stepRefs.current[step];
    const inputs = current ? Array.from(current.querySelectorAll<HTMLInputElement>("input")) : [];
    const firstInvalid = inputs.find((i) => !i.checkValidity());
    if (firstInvalid) {
      firstInvalid.reportValidity();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form
      action={(formData) => {
        // Fuseau lu au moment de l'envoi, dans le navigateur (pas au rendu serveur).
        formData.set("timezone", browserTimeZone());
        return action(formData);
      }}
      className="grid gap-6"
    >
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Étape précédente"
              className="grid size-11 place-items-center rounded-full border border-line bg-surface"
            >
              <ArrowLeftIcon size={20} weight="bold" aria-hidden="true" />
            </button>
          ) : null}
          <div>
            <p className="label-caps">
              Étape {step + 1} sur {STEPS.length}
            </p>
            <h1 className="font-title text-[30px]">{STEPS[step]}</h1>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 rounded-[2px]", i <= step ? "bg-accent" : "bg-line")} />
          ))}
        </div>
      </div>

      <input type="hidden" name="weightUnit" value={unit} />
      <input type="hidden" name="sessionsPerWeek" value={sessions} />

      {/* Étape 1 */}
      <fieldset ref={(el) => { stepRefs.current[0] = el; }} hidden={step !== 0} className="grid gap-5">
        <legend className="sr-only">Toi</legend>
        <p className="text-[15px] text-muted">
          Ces informations servent à estimer tes besoins. Elles restent privées.
        </p>
        <Field id="displayName" name="displayName" label="Prénom ou surnom" autoComplete="given-name" maxLength={40} required error={bad("displayName") ? "Indique un prénom." : null} />
        <div className="grid grid-cols-2 gap-3">
          <Field id="birthYear" name="birthYear" label="Année de naissance" inputMode="numeric" type="number" min={1920} max={2016} required error={bad("birthYear") ? "Année invalide." : null} />
          <Field id="heightCm" name="heightCm" label="Taille" inputMode="decimal" type="number" min={100} max={250} step="0.5" suffix="cm" required error={bad("heightCm") ? "Entre 100 et 250 cm." : null} />
        </div>
        <ChoiceGroup
          name="sex"
          legend="Sexe (pour le calcul du métabolisme)"
          required
          invalid={bad("sex")}
          options={[
            { value: "homme", label: "Homme" },
            { value: "femme", label: "Femme" },
            { value: "autre", label: "Autre" },
          ]}
        />
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field id="weight" name="weight" label="Poids actuel" inputMode="decimal" type="number" min={20} max={900} step="0.1" suffix={unit} required error={bad("weight") ? "Poids invalide." : null} />
          <fieldset className="flex h-12 rounded-control border border-line bg-surface-2 p-1">
            <legend className="sr-only">Unité de poids</legend>
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => setUnit(u)}
                className={cn("w-12 rounded-inner text-sm font-semibold", unit === u ? "bg-accent text-on-accent" : "text-muted")}
              >
                {u}
              </button>
            ))}
          </fieldset>
        </div>
      </fieldset>

      {/* Étape 2 */}
      <fieldset ref={(el) => { stepRefs.current[1] = el; }} hidden={step !== 1} className="grid gap-5">
        <legend className="sr-only">Ton objectif</legend>
        <p className="text-[15px] text-muted">Choisis ton objectif principal. Tu pourras en ajouter d&apos;autres plus tard.</p>
        {GOAL_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-2">
            <p className="label-caps">{group.label}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.goals.map((g) => (
                <label key={g.value}>
                  <input
                    type="radio"
                    name="goal"
                    value={g.value}
                    required
                    className="peer sr-only"
                    onChange={() => setGoal(g.value)}
                  />
                  <span className="flex min-h-12 cursor-pointer items-center rounded-control border border-line bg-surface-2 px-3 py-2 text-[15px] font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent/15 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {goal && GOALS_WITH_EVENT.includes(goal) ? (
          <Field id="targetDate" name="targetDate" type="date" label="Date de la compétition (facultatif)" hint="Pour un compte à rebours et un plan qui s'y adapte." />
        ) : null}
        <ChoiceGroup
          name="level"
          legend="Ton niveau"
          required
          invalid={bad("level")}
          options={[
            { value: "debutant", label: "Débutant" },
            { value: "intermediaire", label: "Intermédiaire" },
            { value: "avance", label: "Avancé" },
          ]}
        />
      </fieldset>

      {/* Étape 3 */}
      <fieldset ref={(el) => { stepRefs.current[2] = el; }} hidden={step !== 2} className="grid gap-5">
        <legend className="sr-only">Ton rythme</legend>
        <p className="text-[15px] text-muted">Combien de séances par semaine peux-tu faire, tous sports confondus ?</p>
        <div className="flex items-center justify-between rounded-control border border-line bg-surface p-4">
          <button type="button" onClick={() => setSessions((s) => Math.max(0, s - 1))} aria-label="Une séance de moins" className="grid size-14 place-items-center rounded-control border border-line bg-surface-2 text-2xl font-semibold">
            −
          </button>
          <p className="text-center">
            <span className="font-numeric block text-[56px]" aria-live="polite">{sessions}</span>
            <span className="text-sm text-muted">séance{sessions > 1 ? "s" : ""} par semaine</span>
          </p>
          <button type="button" onClick={() => setSessions((s) => Math.min(14, s + 1))} aria-label="Une séance de plus" className="grid size-14 place-items-center rounded-control border border-line bg-surface-2 text-2xl font-semibold">
            +
          </button>
        </div>
        <p className="text-[14px] text-muted">
          Sports pratiqués, préférences alimentaires et budget te seront demandés quand le module correspondant arrivera.
        </p>
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-control border border-danger/50 bg-danger/10 p-3 text-[14px] text-text">
          {state.error}
        </p>
      ) : null}

      {step < STEPS.length - 1 ? (
        <Button size="lg" onClick={next}>
          Continuer
        </Button>
      ) : (
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Enregistrement…" : "Commencer"}
        </Button>
      )}
    </form>
  );
}
