import { EyeSlashIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { FriendData } from "@/app/(app)/amis/data";
import { LineChart } from "@/components/charts/line-chart";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { formatCm, SITE_LABELS, type BodySite } from "@/lib/body";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { movingAverage, readiness, type WeightUnit } from "@/lib/engine";
import { SHARE_CATEGORIES, SHARE_LABELS, type Friend, type ShareCategory } from "@/lib/friends";
import { sportName } from "@/lib/planning";
import { formatScore, LEVEL_LABELS } from "@/lib/readiness";
import { formatMinutes } from "@/lib/sports";
import { formatVolume, formatWeight } from "@/lib/training";

type Action = () => void | Promise<void>;

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Fiche d'un ami : ce qu'il me montre (lecture seule), ce que je lui montre (un
 * interrupteur par catégorie) et le retrait de l'amitié.
 */
export function FriendView({
  friend,
  data,
  unit,
  today,
  welcome = false,
  shareAction,
  removeAction,
}: {
  friend: Friend;
  data: FriendData;
  /** Mon unité de poids : les charges d'un ami s'affichent comme les miennes. */
  unit: WeightUnit;
  today: string;
  /** On vient d'ajouter cet ami : on dit quoi faire ensuite. */
  welcome?: boolean;
  shareAction: (category: ShareCategory, shown: boolean) => Action;
  removeAction: Action;
}) {
  const shown = SHARE_CATEGORIES.filter((c) => friend.shownToMe.includes(c));
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
      <div className="grid content-start gap-4">
        {welcome ? (
          <p role="status" className="rounded-control border border-accent-text/60 bg-surface p-4 text-[15px]">
            Vous êtes amis. Pour l&apos;instant, aucun de vous ne voit rien de l&apos;autre : choisis ce que tu montres à {friend.name}.
          </p>
        ) : null}
        <h2 className="label-caps">Ce que {friend.name} te montre</h2>
        {shown.length === 0 ? (
          <div className="flex items-start gap-3 rounded-control border border-dashed border-line p-5 text-[15px] text-muted">
            <EyeSlashIcon size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Rien pour l&apos;instant. {friend.name} choisit, de son côté, ce qu&apos;il ou elle te montre.
            </p>
          </div>
        ) : null}
        {shown.includes("seances") ? <Sessions data={data} unit={unit} /> : null}
        {shown.includes("records") ? <Records data={data} unit={unit} /> : null}
        {shown.includes("poids") ? <Weights data={data} unit={unit} today={today} /> : null}
        {shown.includes("mensurations") ? <Measurements data={data} /> : null}
        {shown.includes("nutrition") ? <Nutrition data={data} /> : null}
        {shown.includes("forme") ? <Readiness data={data} /> : null}
      </div>

      <div className="grid content-start gap-4">
        <section aria-labelledby="partage-titre" className="grid gap-2 overflow-hidden rounded-control border border-line bg-surface shadow-card">
          <div className="grid gap-1 px-4 pt-4 md:px-5 md:pt-5">
            <h2 id="partage-titre" className="text-lg font-semibold">
              Ce que tu lui montres
            </h2>
            <p className="text-[14px] text-muted">En lecture seule, et seulement à {friend.name}. Tu peux refermer à tout moment : l&apos;accès tombe tout de suite.</p>
          </div>
          <ul className="grid divide-y divide-line">
            {SHARE_CATEGORIES.map((category) => {
              const on = friend.shownByMe.includes(category);
              return (
                <li key={category}>
                  <form action={shareAction(category, !on)}>
                    <button type="submit" role="switch" aria-checked={on} aria-label={SHARE_LABELS[category].label} aria-describedby={`partage-${category}`} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 md:px-5">
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-[15px] font-medium">{SHARE_LABELS[category].label}</span>
                        <span id={`partage-${category}`} className="text-[13px] text-muted">
                          {SHARE_LABELS[category].detail}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn("flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-[120ms]", on ? "justify-end border-accent bg-accent" : "justify-start border-line bg-surface-2")}
                      >
                        <span className={cn("size-5 rounded-full", on ? "bg-on-accent" : "bg-muted")} />
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="text-[13px] text-muted">Amis depuis le {formatLongDate(friend.since.slice(0, 10))}. Tes photos et tes notes ne se partagent pas.</p>
        <div className="justify-self-start">
          <ConfirmAction
            action={removeAction}
            label="Retirer cet ami"
            confirmLabel="Retirer"
            question={`Retirer ${friend.name} de tes amis ? Vous ne verrez plus rien l'un de l'autre. Pour redevenir amis, il faudra un nouveau code.`}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, empty, children }: { id: string; title: string; empty: string | null; children: ReactNode }) {
  return (
    <Card aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="text-lg font-semibold">
        {title}
      </h3>
      {empty ? <p className="text-[15px] text-muted">{empty}</p> : children}
    </Card>
  );
}

const rows = "grid divide-y divide-line";
const row = "flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0";

function Sessions({ data, unit }: { data: FriendData; unit: WeightUnit }) {
  const items = [
    ...data.workouts.map((w) => ({
      date: w.date,
      name: w.name,
      detail: [w.minutes > 0 ? formatMinutes(w.minutes) : null, `${w.sets} série${w.sets > 1 ? "s" : ""}`, w.volumeKg > 0 ? formatVolume(w.volumeKg, unit) : null, w.isLight ? "allégée" : null]
        .filter(Boolean)
        .join(" · "),
    })),
    ...data.activities.map((a) => ({ date: a.date, name: sportName(a.sport, a.label), detail: formatMinutes(a.minutes) })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  return (
    <Section id="ami-seances" title="Séances et sports" empty={items.length ? null : "Aucune séance notée pour l'instant."}>
      <ul className={rows}>
        {items.map((item, i) => (
          <li key={i} className={row}>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-[15px] font-medium">{item.name}</span>
              <span className="text-[13px] text-muted">{item.detail}</span>
            </span>
            <span className="shrink-0 text-[13px] text-muted">{formatShortDate(item.date)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Records({ data, unit }: { data: FriendData; unit: WeightUnit }) {
  return (
    <Section id="ami-records" title="Records" empty={data.records.length ? null : "Aucun record pour l'instant."}>
      <ul className={rows}>
        {data.records.slice(0, 12).map((r) => (
          <li key={r.exercise} className={row}>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-[15px] font-medium">{r.exercise}</span>
              <span className="text-[13px] text-muted">
                1RM estimé {formatWeight(r.e1rmKg, unit)} {unit} · {formatShortDate(r.date)}
              </span>
            </span>
            <span className="font-numeric shrink-0 text-[18px]">
              {formatWeight(r.kg, unit)} {unit} × {r.reps}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Weights({ data, unit, today }: { data: FriendData; unit: WeightUnit; today: string }) {
  const last = data.weights.at(-1);
  const first = data.weights[0];
  const average = last ? movingAverage(data.weights, last.date) : null;
  const delta = last && first && first !== last ? last.kg - first.kg : null;
  return (
    <Section id="ami-poids" title="Poids" empty={last ? null : "Aucune pesée ces 90 derniers jours."}>
      {last ? (
        <>
          <p className="text-[15px] text-muted">
            <span className="font-numeric text-[28px] text-text">{formatWeight(last.kg, unit)}</span> {unit}, le {formatShortDate(last.date)}
            {average !== null ? ` · moyenne sur 7 jours : ${formatWeight(average, unit)} ${unit}` : ""}
          </p>
          {delta !== null ? (
            <p className="text-[14px] text-muted">
              {delta >= 0 ? "+" : "−"}
              {formatWeight(Math.abs(delta), unit)} {unit} depuis le {formatShortDate(first.date)} ({data.weights.length} pesées).
            </p>
          ) : null}
          {data.weights.length > 2 ? (
            <LineChart points={data.weights.map((w) => ({ date: w.date, value: w.kg }))} from={first.date} to={today} format={(v) => formatWeight(v, unit)} className="h-32" ticks={3} />
          ) : null}
        </>
      ) : null}
    </Section>
  );
}

function Measurements({ data }: { data: FriendData }) {
  return (
    <Section id="ami-mesures" title="Mesures" empty={data.measurements.length ? null : "Aucune mesure pour l'instant."}>
      <ul className={rows}>
        {data.measurements.map((m) => (
          <li key={m.site} className={row}>
            <span className="grid gap-0.5">
              <span className="text-[15px] font-medium">{SITE_LABELS[m.site as BodySite] ?? m.site}</span>
              <span className="text-[13px] text-muted">{formatShortDate(m.date)}</span>
            </span>
            <span className="font-numeric shrink-0 text-[18px]">{formatCm(m.cm)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Nutrition({ data }: { data: FriendData }) {
  return (
    <Section id="ami-nutrition" title="Nutrition, 7 jours" empty={data.nutrition.length ? null : "Rien de noté ces 7 derniers jours."}>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[13px] text-muted">
            <th scope="col" className="pb-2 font-normal">
              Jour
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              kcal
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Prot.
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Gluc.
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Lip.
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.nutrition.map((n) => (
            <tr key={n.date}>
              <th scope="row" className="py-2 text-left font-medium">
                {formatShortDate(n.date)}
              </th>
              <td className="font-numeric py-2 text-right">{integer.format(n.kcal)}</td>
              <td className="py-2 text-right">{integer.format(n.protein)} g</td>
              <td className="py-2 text-right">{integer.format(n.carbs)} g</td>
              <td className="py-2 text-right">{integer.format(n.fat)} g</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Readiness({ data }: { data: FriendData }) {
  const days = data.checkins.slice(0, 7).map((c) => ({ date: c.date, ...readiness(c) }));
  const average = days.length ? days.reduce((sum, d) => sum + d.score, 0) / days.length : null;
  return (
    <Section id="ami-forme" title="Forme du jour" empty={days.length ? null : "Aucun check-in ces 14 derniers jours."}>
      {average !== null ? (
        <p className="text-[15px] text-muted">
          <span className="font-numeric text-[28px] text-text">{formatScore(days[0].score)}</span> sur 5, le {formatShortDate(days[0].date)} · moyenne des {days.length} derniers
          check-ins : {formatScore(average)}
        </p>
      ) : null}
      <ul className={rows}>
        {days.map((d) => (
          <li key={d.date} className={row}>
            <span className="text-[15px]">{formatShortDate(d.date)}</span>
            <span className="text-[14px] text-muted">
              {LEVEL_LABELS[d.level]} · <span className="font-numeric text-[16px] text-text">{formatScore(d.score)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
