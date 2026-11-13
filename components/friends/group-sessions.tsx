import { CaretRightIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { LiveGroupSession } from "@/app/(app)/amis/seance/data";

/** Les séances communes en cours, chacune en une ligne : une invitation à rejoindre, ou le tableau à rouvrir. */
export function GroupSessionLinks({ sessions, href }: { sessions: LiveGroupSession[]; href: (id: string) => string }) {
  if (sessions.length === 0) return null;
  return (
    <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-accent-text/60 bg-surface">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={href(s.id)} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-accent-text" aria-hidden="true">
              <UsersThreeIcon size={20} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{s.name}</span>
              <span className="block text-[13px] text-muted">{s.joined ? "Séance commune en cours" : "On t'invite à une séance commune"}</span>
            </span>
            <span className="shrink-0 text-sm font-medium text-accent-text">{s.joined ? "Voir" : "Rejoindre"}</span>
            <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
