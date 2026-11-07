import Link from "next/link";
import { cn } from "@/components/ui/cn";

const TABS = [
  { href: "/progres", label: "Poids" },
  { href: "/progres/mensurations", label: "Mensurations" },
  { href: "/progres/photos", label: "Photos" },
  { href: "/progres/force", label: "Force" },
] as const;

export type ProgressSection = (typeof TABS)[number]["href"];

/** Sections de l'onglet Progrès : même place, même ordre sur chaque écran. */
export function ProgressTabs({ current }: { current: ProgressSection }) {
  return (
    <nav aria-label="Sections de Progrès" className="mb-4 grid grid-cols-4 gap-1 rounded-control border border-line bg-surface-2 p-1 md:mb-6 md:max-w-xl">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center rounded-inner px-1 text-center text-[13px] font-medium transition-colors duration-[120ms] sm:text-[14px]",
            t.href === current ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Pastilles de choix qui changent un paramètre de l'adresse (période, pose…). */
export function LinkChips({ label, items }: { label: string; items: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          replace
          scroll={false}
          aria-current={i.current ? "page" : undefined}
          className={cn(
            "flex h-10 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-[120ms]",
            i.current ? "border-accent bg-accent/15 text-text" : "border-line bg-surface text-muted hover:text-text",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
