import { CheckCircleIcon, CircleIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/card";
import { ADAPTIVE_DAYS, kgTo, LOGGED_SHARE, MIN_COUNTED_DAYS, MIN_WEIGH_INS, MIN_WEIGHT_SPAN, type AdaptiveTdee } from "@/lib/engine";
import { formatKcal } from "@/lib/nutrition";

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const date = (d: string) => dayMonth.format(new Date(`${d}T00:00:00Z`));
const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
/** Au-delà de cet écart avec la formule, le journal est sans doute incomplet. */
const FAR_FROM_FORMULA = 0.25;

/**
 * Dépense réelle mesurée sur le journal et les pesées, face à la formule.
 * Quand il manque des données, la carte dit quoi, avec où l'on en est.
 */
export function RealTdeeCard({ real, formulaKcal, unit }: { real: AdaptiveTdee; formulaKcal: number | null; unit: "kg" | "lb" }) {
  const skipped = real.loggedDays - real.countedDays;
  const gap = real.ok && formulaKcal ? (real.kcal - formulaKcal) / formulaKcal : null;
  const stable = real.ok && Math.abs(real.weeklyChangeKg) < 0.05;
  const gained = real.ok && real.weeklyChangeKg > 0;

  return (
    <Card aria-labelledby="depense-titre" className="grid gap-3">
      <h2 id="depense-titre" className="text-lg font-semibold">
        Ta dépense réelle
      </h2>
      {real.ok ? (
        <>
          <p>
            <span className="font-numeric text-[40px] leading-none">{formatKcal(real.kcal)}</span> <span className="text-[15px] text-muted">kcal par jour</span>
          </p>
          <p className="text-[15px] text-muted">
            Du {date(real.from)} au {date(real.to)}, tu as mangé en moyenne {formatKcal(real.intake)} kcal sur {real.countedDays} jours notés.{" "}
            {stable
              ? "Ton poids est resté stable : tu dépenses à peu près ce que tu manges."
              : `Ton poids ${gained ? "monte" : "baisse"} de ${decimal.format(Math.abs(kgTo(unit, real.weeklyChangeKg)))} ${unit} par semaine ; un kilo ${gained ? "pris" : "perdu"} vaut environ 7 700 kcal, ${gained ? "mises en réserve" : "tirées de tes réserves"}.`}
          </p>
          {formulaKcal ? (
            <p className="text-[14px] text-muted">
              La formule de Mifflin-St Jeor donne {formatKcal(formulaKcal)} kcal
              {gap !== null && Math.abs(gap) >= 0.01 ? ` : tu dépenses ${Math.round(Math.abs(gap) * 100)} % ${gap > 0 ? "de plus" : "de moins"}` : ", à peu près pareil"}.
            </p>
          ) : null}
          {gap !== null && Math.abs(gap) > FAR_FROM_FORMULA ? (
            <p className="flex gap-2 rounded-control border border-warning/50 bg-warning/10 p-3 text-[14px]" role="note">
              <WarningIcon size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <span>
                <span className="font-semibold">Très loin de la formule.</span> Souvent, un journal incomplet : huiles, sauces, boissons ou grignotages oubliés.
                Vérifie quelques jours avant de t&apos;y fier.
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted">
            {real.reason === "incoherent"
              ? "Le calcul donne une valeur hors de toute plage plausible, souvent à cause d'un journal incomplet ou d'une pesée erronée. Continue de noter : la mesure se corrige d'elle-même."
              : `Fonte la mesure d'après ce que tu manges et l'évolution de ton poids sur ${ADAPTIVE_DAYS} jours. Il manque encore :`}
          </p>
          {real.reason === "incoherent" ? null : (
            <ul className="grid gap-2">
              <Requirement done={real.countedDays >= MIN_COUNTED_DAYS} label={`${MIN_COUNTED_DAYS} jours bien notés`} count={`${Math.min(real.countedDays, MIN_COUNTED_DAYS)} sur ${MIN_COUNTED_DAYS}`} />
              <Requirement
                done={real.weighIns >= MIN_WEIGH_INS && real.weightSpanDays >= MIN_WEIGHT_SPAN}
                label={`${MIN_WEIGH_INS} pesées étalées sur deux semaines`}
                count={real.weighIns < MIN_WEIGH_INS ? `${real.weighIns} sur ${MIN_WEIGH_INS}` : `sur ${real.weightSpanDays} j`}
              />
            </ul>
          )}
        </>
      )}
      {skipped > 0 ? (
        <p className="text-[13px] text-muted">
          {skipped} jour{skipped > 1 ? "s" : ""} noté{skipped > 1 ? "s" : ""} à moins de {Math.round(LOGGED_SHARE * 100)} % d&apos;un jour habituel{" "}
          {skipped > 1 ? "ont été écartés" : "a été écarté"} : sans doute des oublis.
        </p>
      ) : null}
    </Card>
  );
}

function Requirement({ done, label, count }: { done: boolean; label: string; count: string }) {
  const Icon = done ? CheckCircleIcon : CircleIcon;
  return (
    <li className="flex items-center gap-2.5 text-[15px]">
      <Icon size={20} weight={done ? "fill" : "regular"} className={done ? "shrink-0 text-accent-text" : "shrink-0 text-muted"} aria-hidden="true" />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-[14px] text-muted tabular-nums">
        {count}
        <span className="sr-only">{done ? ", fait" : ", pas encore"}</span>
      </span>
    </li>
  );
}
