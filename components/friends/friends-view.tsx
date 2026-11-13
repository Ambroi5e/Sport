import { CaretRightIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { AcceptState, InviteState } from "@/app/(app)/amis/actions";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { categoryList, type Friend } from "@/lib/friends";
import { CodeForm } from "./code-form";
import { InviteCard } from "./invite-card";

/** Amis : la liste, puis les deux façons de s'ajouter (donner un code, saisir un code). */
export function FriendsView({
  friends,
  friendHref,
  inviteAction,
  acceptAction,
}: {
  friends: Friend[];
  friendHref: (id: string) => string;
  inviteAction: () => Promise<InviteState>;
  acceptAction: (state: AcceptState, formData: FormData) => Promise<AcceptState>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
      <section aria-labelledby="amis-titre" className="grid content-start gap-2">
        <h2 id="amis-titre" className="label-caps">
          {friends.length > 1 ? `${friends.length} amis` : friends.length === 1 ? "1 ami" : "Tes amis"}
        </h2>
        {friends.length ? (
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {friends.map((f) => (
              <li key={f.id}>
                <Link href={friendHref(f.id)} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="font-title grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[18px] text-accent-text" aria-hidden="true">
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-[16px] font-semibold">{f.name}</span>
                    <span className="text-[13px] text-muted">Te montre : {categoryList(f.shownToMe)}</span>
                    <span className="text-[13px] text-muted">Tu lui montres : {categoryList(f.shownByMe)}</span>
                  </span>
                  <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<UsersThreeIcon size={22} />} title="Aucun ami pour l'instant">
            Crée un code d&apos;ami et donne-le à quelqu&apos;un, ou saisis le sien. Ensuite, chacun choisit ce qu&apos;il montre à l&apos;autre : par défaut, rien.
          </EmptyState>
        )}
        <p className="text-[13px] text-muted">
          Personne ne peut te chercher dans Fonte : on ne devient amis qu&apos;avec un code donné de la main à la main. Tes photos ne se partagent pas.
        </p>
      </section>

      <div className="grid content-start gap-4">
        <Card aria-labelledby="inviter-titre" className="grid gap-3">
          <h2 id="inviter-titre" className="text-lg font-semibold">
            Inviter un ami
          </h2>
          <InviteCard action={inviteAction} />
        </Card>
        <Card aria-labelledby="code-titre" className="grid gap-3">
          <h2 id="code-titre" className="text-lg font-semibold">
            J&apos;ai un code
          </h2>
          <CodeForm action={acceptAction} />
        </Card>
      </div>
    </div>
  );
}
