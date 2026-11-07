"use client";

import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";
import {
  createTemplate,
  moveTemplateItem,
  removeTemplateItem,
  renameTemplate,
  updateTemplateItem,
  type FormState,
} from "@/app/(app)/entrainement/actions";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Création d'un modèle : un nom suffit, les exercices s'ajoutent ensuite. */
export function CreateTemplateForm() {
  const [state, action] = useActionState(createTemplate, {} as FormState);
  return (
    <form action={action} className="flex items-start gap-2" noValidate>
      <Field id="nouveau-modele" name="name" label="Nouveau modèle" placeholder="Push A, Haut du corps…" error={state.error} maxLength={60} className="flex-1" />
      <SubmitButton variant="secondary" className="mt-[26px] shrink-0">
        Créer
      </SubmitButton>
    </form>
  );
}

export function RenameTemplateForm({ templateId, name }: { templateId: string; name: string }) {
  const [state, action] = useActionState(renameTemplate.bind(null, templateId), {} as FormState);
  return (
    <form action={action} className="flex items-start gap-2" noValidate>
      <Field id="nom-modele" name="name" label="Nom du modèle" defaultValue={name} error={state.error} maxLength={60} className="flex-1" />
      <SubmitButton variant="secondary" className="mt-[26px] shrink-0">
        Renommer
      </SubmitButton>
    </form>
  );
}

type Item = { id: string; name: string; timed: boolean; sets: number; repMin: number | null; repMax: number | null };

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-control border border-line bg-surface-2 text-text transition-colors hover:bg-line/60 disabled:opacity-40";

/** Exercices du modèle : séries et fourchette de répétitions, ordre, retrait. Enregistré à chaque changement. */
export function TemplateItems({ templateId, items }: { templateId: string; items: Item[] }) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {items.map((item, index) => (
        <TemplateItemRow key={item.id} templateId={templateId} item={item} first={index === 0} last={index === items.length - 1} />
      ))}
    </ol>
  );
}

function TemplateItemRow({ templateId, item, first, last }: { templateId: string; item: Item; first: boolean; last: boolean }) {
  const [values, setValues] = useState({ sets: item.sets, repMin: item.repMin, repMax: item.repMax });
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: typeof values) {
    setValues(next);
    startTransition(async () => {
      const { ok } = await updateTemplateItem(item.id, next);
      setFailed(!ok);
    });
  }

  const repInput = (key: "repMin" | "repMax", label: string) => (
    <label className="grid gap-1">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        defaultValue={values[key] ?? ""}
        onBlur={(e) => {
          const n = e.currentTarget.value === "" ? null : Math.round(Number(e.currentTarget.value));
          if (n !== values[key] && (n === null || (n >= 1 && n <= 100))) save({ ...values, [key]: n });
        }}
        className="font-numeric h-11 w-16 rounded-control border border-line bg-surface-2 text-center text-[20px] focus:border-accent focus:outline-none"
      />
    </label>
  );

  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-control border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{item.name}</p>
        <button type="button" className={iconButton} aria-label={`Monter ${item.name}`} disabled={first || pending} onClick={() => startTransition(() => moveTemplateItem(templateId, item.id, "up"))}>
          <ArrowUpIcon size={18} aria-hidden="true" />
        </button>
        <button type="button" className={iconButton} aria-label={`Descendre ${item.name}`} disabled={last || pending} onClick={() => startTransition(() => moveTemplateItem(templateId, item.id, "down"))}>
          <ArrowDownIcon size={18} aria-hidden="true" />
        </button>
        <button type="button" className={cn(iconButton, "text-danger")} aria-label={`Retirer ${item.name} du modèle`} disabled={pending} onClick={() => startTransition(() => removeTemplateItem(templateId, item.id))}>
          <TrashIcon size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <span className="text-[12px] text-muted" id={`series-${item.id}`}>
            Séries
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby={`series-${item.id}`}>
            <button type="button" className={iconButton} aria-label="Une série de moins" disabled={values.sets <= 1} onClick={() => save({ ...values, sets: values.sets - 1 })}>
              <MinusIcon size={18} weight="bold" aria-hidden="true" />
            </button>
            <span className="font-numeric w-8 text-center text-[26px]" aria-live="polite">
              {values.sets}
            </span>
            <button type="button" className={iconButton} aria-label="Une série de plus" disabled={values.sets >= 20} onClick={() => save({ ...values, sets: values.sets + 1 })}>
              <PlusIcon size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
        {item.timed ? null : (
          <div className="flex items-end gap-2">
            {repInput("repMin", "Reps min")}
            <span className="pb-2.5 text-muted" aria-hidden="true">
              à
            </span>
            {repInput("repMax", "Reps max")}
          </div>
        )}
      </div>
      {failed ? (
        <p role="alert" className="text-[13px] text-danger">
          Pas enregistré. Vérifie que le minimum ne dépasse pas le maximum, puis réessaie.
        </p>
      ) : null}
    </li>
  );
}
