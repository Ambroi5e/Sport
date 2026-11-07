import { HeartIcon } from "@phosphor-icons/react/ssr";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Remplacement d'un exercice du programme : des exercices équivalents (mêmes
 * muscles, même type de mesure), ceux qu'on aime en premier. Deux taps : choisir,
 * remplacer.
 */
export function ReplaceForm({
  action,
  current,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  current: string;
  options: { id: string; name: string; detail: string; liked: boolean }[];
}) {
  return (
    <form action={action} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Remplacer par</legend>
        <div className="grid gap-2">
          {options.map((o, i) => (
            <label key={o.id} className="relative">
              <input type="radio" name="exerciseId" value={o.id} defaultChecked={i === 0} required className="peer sr-only" />
              <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-line bg-surface-2 px-4 py-2.5 transition-colors peer-checked:border-accent peer-checked:bg-accent/15 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{o.name}</span>
                  <span className="block truncate text-[13px] text-muted">{o.detail}</span>
                </span>
                {o.liked ? <HeartIcon size={18} weight="fill" className="shrink-0 text-accent-text" aria-label="Tu aimes cet exercice" /> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" name="avoid" className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>
          Ne plus me proposer {current}
          <span className="block text-[13px] text-muted">Il sera écarté des prochains programmes. Tu peux changer d&apos;avis depuis sa fiche.</span>
        </span>
      </label>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Remplacement…">
        Remplacer
      </SubmitButton>
    </form>
  );
}
