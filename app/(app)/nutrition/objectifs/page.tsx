import type { Metadata } from "next";
import { RealTdeeCard } from "@/components/nutrition/real-tdee-card";
import { TargetsForm } from "@/components/nutrition/targets-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { ADAPTIVE_DAYS, adaptiveTdee, GOAL_FACTORS, HIGH_PROTEIN_GOALS, kgTo, suggestTargets } from "@/lib/engine";
import { GOAL_LABELS } from "@/lib/goals";
import { getPrimaryGoal } from "../../weight-data";
import { getDailyIntake, getLatestWeightKg, getTargets, getWeightsSince } from "../data";

export const metadata: Metadata = { title: "Cibles" };

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « +10 % », « −20 % » ou « maintien », d'après le facteur du moteur. */
function goalEffect(goal: string): string {
  const factor = GOAL_FACTORS[goal];
  if (!factor) return "maintien";
  const pct = Math.round((factor - 1) * 100);
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
}

/**
 * Cibles par type de jour, avec un repère jamais imposé : la dépense réelle
 * (journal et pesées) quand elle est fiable, sinon la formule du profil.
 */
export default async function TargetsPage() {
  const profile = (await getProfile())!;
  const unit = profile.weight_unit === "lb" ? "lb" : "kg";
  const today = localDate(profile.timezone);
  const since = addDays(today, -ADAPTIVE_DAYS);
  const [targets, weightKg, goal, intake, weights] = await Promise.all([
    getTargets(),
    getLatestWeightKg(),
    getPrimaryGoal(profile.user_id),
    getDailyIntake(since, addDays(today, -1)),
    getWeightsSince(since),
  ]);
  const real = adaptiveTdee({ intake, weights, asOf: today });
  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const sessions = profile.sessions_per_week ?? 0;
  const ready = profile.sex && weightKg && profile.height_cm && age;
  const inputs = ready
    ? { sex: profile.sex!, weightKg: weightKg!, heightCm: Number(profile.height_cm), age: age!, sessionsPerWeek: sessions, goal: goal?.type ?? null }
    : null;
  const formula = inputs ? suggestTargets(inputs) : null;
  const suggestion = inputs && real.ok ? suggestTargets({ ...inputs, maintenanceKcal: real.kcal }) : formula;

  return (
    <>
      <PageHeader title="Cibles" back="/nutrition" />
      <div className="grid gap-4 md:max-w-xl">
        <RealTdeeCard real={real} formulaKcal={formula?.maintenance ?? null} unit={unit} />
        <Card className="grid gap-3">
          <h2 className="text-lg font-semibold">D&apos;où vient le repère</h2>
          {suggestion ? (
            <p className="text-[15px] text-muted">
              {real.ok
                ? `Point de départ : ta dépense réelle, environ ${suggestion.maintenance.toLocaleString("fr-FR")} kcal par jour pour maintenir ton poids.`
                : `Métabolisme de base (formule de Mifflin-St Jeor) pour ${numberFormat.format(kgTo(unit, weightKg!))} ${unit}, ${profile.height_cm} cm et ${age} ans, multiplié selon tes ${sessions} séance${sessions > 1 ? "s" : ""} par semaine : environ ${suggestion.maintenance.toLocaleString("fr-FR")} kcal pour maintenir ton poids.`}
              {goal ? ` Objectif ${GOAL_LABELS[goal.type].toLowerCase()} : ${goalEffect(goal.type)}.` : " Sans objectif principal : maintien."}{" "}
              Un jour d&apos;entraînement a 5 % de plus, un jour de repos 5 % de moins. Protéines : {HIGH_PROTEIN_GOALS.has(goal?.type ?? "") ? "2" : "1,6"} g par kg.
            </p>
          ) : (
            <p className="text-[15px] text-muted">
              Pour un repère calculé, il faut ton sexe, ton année de naissance, ta taille et une pesée. Tu peux aussi saisir directement tes cibles ci-dessous.
            </p>
          )}
          <p className="text-[14px] text-muted">
            C&apos;est un repère général, pas une prescription. En cas de problème de santé, de grossesse, de trouble du comportement alimentaire
            ou de besoin particulier, demande conseil à un diététicien ou à ton médecin.
          </p>
        </Card>
        <TargetsForm current={targets} trainingDays={profile.training_days} suggestion={suggestion} source={real.ok ? "D'après ta dépense réelle" : "D'après la formule de ton profil"} />
      </div>
    </>
  );
}
