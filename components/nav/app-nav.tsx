"use client";

import {
  BarbellIcon,
  ChartLineUpIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HouseIcon,
  PlusIcon,
  ShoppingCartIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/components/ui/cn";

type Tab = { href: string; label: string; icon: Icon };

const TABS: Tab[] = [
  { href: "/", label: "Accueil", icon: HouseIcon },
  { href: "/entrainement", label: "Entraînement", icon: BarbellIcon },
  { href: "/nutrition", label: "Nutrition", icon: ForkKnifeIcon },
  { href: "/courses", label: "Courses", icon: ShoppingCartIcon },
  { href: "/progres", label: "Progrès", icon: ChartLineUpIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Barre d'onglets en bas sur mobile, sidebar sur ordinateur. */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {/* Ordinateur */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
          <Logo size={30} />
          <span className="font-title text-2xl uppercase">Fonte</span>
        </Link>
        <nav aria-label="Navigation principale" className="grid gap-1">
          {TABS.map(({ href, label, icon: TabIcon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
                  active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <TabIcon size={22} weight={active ? "fill" : "regular"} className={active ? "text-accent-text" : undefined} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-1">
          {isAdmin ? (
            <Link href="/admin" className="flex h-11 items-center gap-3 rounded-control px-3 text-[15px] text-muted hover:bg-surface-2 hover:text-text">
              <span className="grid size-[22px] place-items-center text-[11px] font-bold" aria-hidden="true">A</span>
              Admin
            </Link>
          ) : null}
          <Link
            href="/amis"
            aria-current={isActive(pathname, "/amis") ? "page" : undefined}
            className="flex h-11 items-center gap-3 rounded-control px-3 text-[15px] text-muted hover:bg-surface-2 hover:text-text"
          >
            <UsersThreeIcon size={22} aria-hidden="true" />
            Amis
          </Link>
          <Link
            href="/reglages"
            aria-current={isActive(pathname, "/reglages") ? "page" : undefined}
            className="flex h-11 items-center gap-3 rounded-control px-3 text-[15px] text-muted hover:bg-surface-2 hover:text-text"
          >
            <GearSixIcon size={22} aria-hidden="true" />
            Réglages
          </Link>
        </div>
      </aside>

      {/* Mobile : bouton + flottant */}
      <Link
        href="/ajouter"
        aria-label="Ajouter"
        className="fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_20px_rgb(0_0_0/0.35)] transition-transform duration-[120ms] active:scale-95 md:hidden"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
      >
        <PlusIcon size={26} weight="bold" aria-hidden="true" />
      </Link>

      {/* Mobile : onglets */}
      <nav
        aria-label="Navigation principale"
        className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: TabIcon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-accent-text" : "text-muted",
                  )}
                >
                  <TabIcon size={24} weight={active ? "fill" : "regular"} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
