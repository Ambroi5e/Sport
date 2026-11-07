import type { ReactNode } from "react";

/** État vide : ce qui apparaîtra ici, et quand. */
export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-[6px] border border-dashed border-line p-5">
      <span className="grid size-10 place-items-center rounded-[6px] bg-surface-2 text-accent-text" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="max-w-prose text-[15px] text-muted">{children}</div>
    </div>
  );
}
