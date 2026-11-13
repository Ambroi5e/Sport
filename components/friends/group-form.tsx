"use client";

import { useActionState } from "react";
import type { GroupFormState } from "@/app/(app)/amis/seance/actions";
import { CheckChips } from "@/components/ui/check-chips";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Lancer une séance commune : un nom, et les amis à inviter. */
export function GroupForm({
  friends,
  action,
}: {
  friends: { id: string; name: string }[];
  action: (state: GroupFormState, formData: FormData) => Promise<GroupFormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-5">
      <Field id="nom-seance" name="name" label="Nom" placeholder="Séance commune" defaultValue={state.name} maxLength={40} hint="Facultatif : « Samedi matin », « Jambes à trois »." />
      <CheckChips
        key={state.friends?.join() ?? ""}
        name="friends"
        legend="Qui inviter"
        options={friends.map((f) => ({ value: f.id, label: f.name }))}
        defaultValues={state.friends}
        invalid={Boolean(state.error)}
        hint="Chacun fait sa propre séance. Ceux qui rejoignent voient les séries des autres en direct : exercice, charge, répétitions."
      />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full" pendingLabel="Lancement…">
        Lancer la séance commune
      </SubmitButton>
    </form>
  );
}
