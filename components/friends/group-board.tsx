import { CheckIcon, HourglassIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { GroupSessionView } from "@/app/(app)/amis/seance/data";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SubmitButton } from "@/components/ui/submit-button";
import type { GroupEvent, WeightUnit } from "@/lib/engine";
import { formatDuration, formatVolume, formatWeight } from "@/lib/training";

type Action = () => void | Promise<void>;

/** « 80 kg × 6 », « 12 répétitions », « 45 s ». */
function setText(e: GroupEvent, unit: WeightUnit): string {
  if (e.durationSeconds) return formatDuration(e.durationSeconds);
  if (e.weightKg) return `${formatWeight(e.weightKg, unit)} ${unit} × ${e.reps ?? 0}`;
  return `${e.reps ?? 0} répétition${(e.reps ?? 0) > 1 ? "s" : ""}`;
}

/** « à l'instant », « il y a 3 min », « il y a 1 h 05 ». */
export function ago(at: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Tableau d'une séance commune : rejoindre, puis chaque participant (séries,
 * exercice en cours, dernière série) et le fil des dernières séries.
 */
export function GroupBoard({
  session,
  unit,
  now,
  workoutHref,
  joinAction,
  leaveAction,
  endAction,
}: {
  session: GroupSessionView;
  /** Mon unité de poids : les charges des autres s'affichent comme les miennes. */
  unit: WeightUnit;
  now: number;
  /** Ma séance en cours, ou l'Entraînement pour en démarrer une. */
  workoutHref: string;
  joinAction: Action;
  leaveAction: Action;
  endAction: Action;
}) {
  const { me, board, feed, live } = session;
  const names = new Map(board.map((r) => [r.userId, r.name]));
  const present = board.filter((r) => r.joinedAt !== null);
  const owner = board.find((r) => r.isOwner);

  if (!me.joined) {
    return (
      <div className="grid gap-4 md:max-w-xl">
        <Card aria-labelledby="rejoindre-titre" className="grid gap-4 border-accent-text/60">
          <div className="grid gap-1">
            <p className="label-caps">Invitation</p>
            <h2 id="rejoindre-titre" className="font-title text-[26px]">
              {owner?.name ?? "Un ami"} t&apos;invite
            </h2>
          </div>
          <p className="text-[15px]">
            Chacun fait sa propre séance. En rejoignant, tu montres aux participants, pendant cette séance commune, chaque série que tu termines : l&apos;exercice,
            la charge et les répétitions. Tes séries d&apos;échauffement et tes notes ne partent pas.
          </p>
          <p className="text-[14px] text-muted">
            Déjà là : {present.map((r) => r.name).join(", ") || "personne pour l'instant"}. Invités : {board.length} en tout.
          </p>
          {live ? (
            <form action={joinAction}>
              <SubmitButton size="lg" className="w-full" pendingLabel="…">
                Rejoindre la séance commune
              </SubmitButton>
            </form>
          ) : (
            <p className="text-[15px] text-muted">Cette séance commune est terminée.</p>
          )}
          <form action={leaveAction}>
            <SubmitButton variant="ghost" className="w-full" pendingLabel="…">
              {live ? "Pas cette fois" : "Retirer l'invitation"}
            </SubmitButton>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
      <div className="grid content-start gap-4">
        <p className="flex items-center gap-2 text-[14px] text-muted" role="status">
          <span className={cn("size-2.5 rounded-full", live ? "bg-success" : "bg-muted")} aria-hidden="true" />
          {live ? `En direct · ${present.length} présent${present.length > 1 ? "s" : ""} sur ${board.length}` : "Séance commune terminée"}
        </p>

        <ul className="grid gap-3 sm:grid-cols-2">
          {board.map((row) => (
            <li key={row.userId}>
              <Card className={cn("grid h-full content-start gap-2", row.userId === me.userId && "border-accent-text/60")}>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate text-lg font-semibold">
                    {row.name}
                    {row.userId === me.userId ? <span className="font-normal text-muted"> · toi</span> : null}
                  </h2>
                  {row.joinedAt ? (
                    <span className="font-numeric shrink-0 text-[22px]">
                      {row.sets}
                      <span className="font-sans text-[13px] font-normal text-muted"> série{row.sets > 1 ? "s" : ""}</span>
                    </span>
                  ) : null}
                </div>
                {row.joinedAt === null ? (
                  <p className="flex items-center gap-1.5 text-[14px] text-muted">
                    <HourglassIcon size={16} aria-hidden="true" /> Invité, pas encore là
                  </p>
                ) : row.last ? (
                  <>
                    <p className="text-[15px]">
                      <span className="font-medium">{row.last.exercise}</span>
                      <span className="text-muted"> · série {row.lastSetNumber}</span>
                    </p>
                    <p className="font-numeric text-[20px]">{setText(row.last, unit)}</p>
                    <p className="text-[13px] text-muted">
                      {ago(row.last.at, now)}
                      {row.volumeKg > 0 ? ` · ${formatVolume(row.volumeKg, unit)} soulevés` : ""}
                    </p>
                  </>
                ) : (
                  <p className="flex items-center gap-1.5 text-[14px] text-muted">
                    <CheckIcon size={16} aria-hidden="true" /> Présent, pas encore de série
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>

        {live ? (
          <Link href={workoutHref} className={buttonClasses("primary", "lg", "w-full")}>
            Ma séance
          </Link>
        ) : null}
      </div>

      <div className="grid content-start gap-4">
        <section aria-labelledby="fil-titre" className="grid gap-2">
          <h2 id="fil-titre" className="label-caps">
            Dernières séries
          </h2>
          {feed.length ? (
            <ol className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
              {feed.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-[15px]">
                      <span className="font-semibold">{names.get(e.userId) ?? "Parti"}</span> · {e.exercise}
                    </span>
                    <span className="text-[13px] text-muted">{ago(e.at, now)}</span>
                  </span>
                  <span className="font-numeric shrink-0 text-[17px]">{setText(e, unit)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-control border border-dashed border-line p-4 text-[15px] text-muted">
              Rien pour l&apos;instant. Dès que quelqu&apos;un valide une série dans sa séance, elle apparaît ici.
            </p>
          )}
        </section>
        <p className="text-[13px] text-muted">
          Seuls les participants présents voient ce fil. Il s&apos;arrête quand la séance commune est terminée, ou six heures après son lancement.
        </p>
        <div className="flex flex-wrap gap-2">
          {me.isOwner && live ? (
            <ConfirmAction action={endAction} label="Terminer la séance commune" confirmLabel="Terminer" question="Terminer pour tout le monde ? Les séries suivantes ne partiront plus dans le fil. Vos séances à chacun continuent." />
          ) : null}
          {!me.isOwner ? (
            <ConfirmAction action={leaveAction} label="Quitter" confirmLabel="Quitter" question="Quitter cette séance commune ? Tes prochaines séries ne partiront plus dans le fil." />
          ) : null}
        </div>
      </div>
    </div>
  );
}
