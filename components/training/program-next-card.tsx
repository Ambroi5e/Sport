import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

/** Carte de l'Entraînement : la prochaine séance du programme, à lancer en un tap. */
export function ProgramNextCard({
  week,
  deload,
  session,
  startAction,
}: {
  week: number;
  deload: boolean;
  session: { id: string; name: string; exerciseNames: string[] };
  startAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Card aria-labelledby="programme-titre" className="grid gap-3 border-accent-text/60">
      <p className="label-caps">
        Programme · semaine {week}
        {deload ? ", décharge" : ""}
      </p>
      <h2 id="programme-titre" className="font-title text-[26px]">
        {session.name}
      </h2>
      <p className="truncate text-[14px] text-muted">{session.exerciseNames.join(", ")}</p>
      <form action={startAction}>
        <input type="hidden" name="templateId" value={session.id} />
        <SubmitButton size="lg" className="w-full" pendingLabel="Démarrage…">
          Démarrer
        </SubmitButton>
      </form>
      <Link href="/entrainement/programme" className="justify-self-start text-sm font-medium text-accent-text underline-offset-4 hover:underline">
        Voir le programme et la charge suggérée
      </Link>
    </Card>
  );
}
