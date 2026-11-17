"use client";

import { CheckCircleIcon, FileArrowUpIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ImportBatch, ImportResult } from "@/app/(app)/entrainement/historique/importer/actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/lib/dates";
import { IMPORT_BATCH, readStrengthCsv, STRENGTH_MAX_BYTES, suggestExercise, type StrengthImport as Parsed } from "@/lib/engine";

const selectClass = "h-12 w-full rounded-control border border-line bg-surface-2 px-3 text-base text-text focus:border-accent focus:outline-none";
const SOURCE_LABELS = { strong: "Strong", hevy: "Hevy" } as const;
const fr = new Intl.NumberFormat("fr-FR");

type Choice = { id: string; slug: string | null; name: string };
type Progress = { state: "idle" } | { state: "sending"; done: number; total: number } | { state: "done"; added: number; duplicates: number } | { state: "error"; message: string; added: number };

/**
 * Importer son historique Strong ou Hevy : le CSV est lu ici, dans le navigateur.
 * Seules les séries des exercices reliés au catalogue partent vers Fonte, par paquets.
 */
export function StrengthImport({
  action,
  choices,
  unit,
  initial = null,
}: {
  action: (batch: ImportBatch) => Promise<ImportResult>;
  choices: Choice[];
  /** Unité du profil, proposée pour un export Strong (qui ne l'écrit pas). */
  unit: "kg" | "lb";
  /** Fichier déjà lu, pour l'aperçu. */
  initial?: { name: string; text: string } | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(initial);
  const [strongUnit, setStrongUnit] = useState(unit);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Progress>({ state: "idle" });

  const parsed = useMemo(() => (file ? readStrengthCsv(file.text, strongUnit) : null), [file, strongUnit]);
  const chosen = (name: string) => mapping[name] ?? suggestExercise(name, choices) ?? "";

  async function read(picked: File | undefined) {
    if (!picked) return;
    setError(null);
    setProgress({ state: "idle" });
    if (picked.size > STRENGTH_MAX_BYTES) return setError("Ce fichier dépasse 20 Mo. Vérifie que c'est bien l'export CSV de Strong ou de Hevy.");
    const text = await picked.text();
    if (!readStrengthCsv(text)) return setError("Fonte ne reconnaît pas ce fichier. Il faut l'export CSV de Strong (Réglages, Exporter les données) ou de Hevy (Profil, Exporter les séances).");
    setMapping({});
    setFile({ name: picked.name, text });
  }

  const ready = parsed ? toBatch(parsed, chosen) : [];
  const linkedSets = ready.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
  const sending = progress.state === "sending";

  async function send() {
    if (ready.length === 0) return;
    let added = 0;
    let duplicates = 0;
    for (let i = 0; i < ready.length; i += IMPORT_BATCH) {
      setProgress({ state: "sending", done: i, total: ready.length });
      const result = await action(ready.slice(i, i + IMPORT_BATCH)).catch(() => null);
      if (!result || !result.ok) {
        setProgress({ state: "error", added, message: result?.error ?? "L'import s'est arrêté. Vérifie ta connexion et relance : les séances déjà enregistrées ne seront pas doublées." });
        return;
      }
      added += result.added;
      duplicates += result.duplicates;
    }
    setProgress({ state: "done", added, duplicates });
  }

  return (
    <div className="grid gap-6">
      <Card aria-labelledby="import-titre" className="grid gap-3">
        <h2 id="import-titre" className="text-lg font-semibold">
          {file ? file.name : "Choisis ton export Strong ou Hevy"}
        </h2>
        {parsed ? (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Total label="Séances" value={fr.format(parsed.workouts.length)} />
              <Total label="Exercices" value={fr.format(parsed.exercises.length)} />
              <Total label="Séries" value={fr.format(parsed.exercises.reduce((n, e) => n + e.sets, 0))} />
            </dl>
            <p className="text-[14px] text-muted">
              Export {SOURCE_LABELS[parsed.source]}, du {formatLongDate(parsed.workouts[0].date)} au {formatLongDate(parsed.workouts.at(-1)!.date)}.
              {parsed.skipped > 0 ? ` ${fr.format(parsed.skipped)} ligne${parsed.skipped > 1 ? "s" : ""} écartée${parsed.skipped > 1 ? "s" : ""} : cardio, minuteur de repos ou valeur hors limites.` : ""}
            </p>
            {parsed.source === "strong" ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-sm font-medium">Unité des charges dans Strong</legend>
                <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                  {(["kg", "lb"] as const).map((u) => (
                    <label key={u} className="relative">
                      <input type="radio" name="unite" value={u} checked={strongUnit === u} onChange={() => setStrongUnit(u)} disabled={sending} className="peer sr-only" />
                      <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-control border bg-surface-2 px-3 text-[15px] font-medium transition-colors duration-[120ms] peer-checked:border-accent peer-checked:bg-accent/15 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                        {u}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </>
        ) : (
          <p className="text-[15px] text-muted">
            Dans Strong : Réglages, Exporter les données. Dans Hevy : Profil, Réglages, Exporter et importer, Exporter les séances. Fonte reprend tes séances, tes
            séries, tes charges et tes échauffements : tes records et tes courbes de progrès repartent de ton vrai historique.
          </p>
        )}
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => read(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={sending}
          className={buttonClasses(file ? "secondary" : "primary", "lg", "w-full sm:w-auto sm:justify-self-start")}
        >
          <FileArrowUpIcon size={20} aria-hidden="true" /> {file ? "Choisir un autre fichier" : "Choisir un fichier"}
        </button>
        {error ? (
          <p role="alert" className="text-[14px] text-danger">
            {error}
          </p>
        ) : null}
        <p className="text-[13px] text-muted">
          Le fichier reste sur ton appareil. Seules les séries des exercices que tu relies partent vers Fonte ; les notes, la RPE et le cardio ne sont pas envoyés.
        </p>
      </Card>

      {parsed ? (
        <section aria-labelledby="import-exercices-titre" className="grid gap-3">
          <div>
            <h2 id="import-exercices-titre" className="text-lg font-semibold">
              Relie tes exercices
            </h2>
            <p className="text-[14px] text-muted">
              Fonte a reconnu {parsed.exercises.filter((e) => chosen(e.name)).length} exercice{parsed.exercises.length > 1 ? "s" : ""} sur {parsed.exercises.length}. Un
              exercice laissé sur « Ne pas importer » est écarté ; pour le garder, crée-le d&apos;abord dans{" "}
              <Link href="/entrainement/exercices/nouveau" className="underline underline-offset-2">
                Exercices
              </Link>
              , puis reviens ici.
            </p>
          </div>
          <ul className="grid divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {parsed.exercises.map((e, i) => (
              <li key={e.name} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_minmax(0,18rem)] md:items-center md:gap-4">
                <label htmlFor={`exercice-${i}`} className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{e.name}</span>
                  <span className="block text-[13px] text-muted">
                    {fr.format(e.sets)} série{e.sets > 1 ? "s" : ""}
                  </span>
                </label>
                <select
                  id={`exercice-${i}`}
                  value={chosen(e.name)}
                  disabled={sending}
                  onChange={(ev) => setMapping((m) => ({ ...m, [e.name]: ev.target.value }))}
                  className={selectClass}
                >
                  <option value="">Ne pas importer</option>
                  {choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <div className="grid gap-2" aria-live="polite">
            {progress.state === "done" ? (
              <p className="flex items-start gap-2 text-[15px]">
                <CheckCircleIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  {fr.format(progress.added)} séance{progress.added > 1 ? "s" : ""} ajoutée{progress.added > 1 ? "s" : ""}
                  {progress.duplicates > 0 ? `, ${fr.format(progress.duplicates)} déjà présente${progress.duplicates > 1 ? "s" : ""}` : ""}.{" "}
                  <Link href="/entrainement/historique" className="underline underline-offset-2">
                    Voir l&apos;historique
                  </Link>
                </span>
              </p>
            ) : progress.state === "error" ? (
              <p role="alert" className="text-[14px] text-danger">
                {progress.message}
                {progress.added > 0 ? ` ${fr.format(progress.added)} séance${progress.added > 1 ? "s" : ""} déjà ajoutée${progress.added > 1 ? "s" : ""}.` : ""}
              </p>
            ) : sending ? (
              <p className="text-[14px] text-muted">
                Import en cours : {fr.format(progress.done)} séances sur {fr.format(progress.total)}…
              </p>
            ) : null}
            {progress.state !== "done" ? (
              <button type="button" onClick={send} disabled={sending || ready.length === 0} className={buttonClasses("primary", "lg", "w-full sm:w-auto sm:justify-self-start")}>
                {ready.length === 0
                  ? "Relie au moins un exercice"
                  : `Importer ${fr.format(ready.length)} séance${ready.length > 1 ? "s" : ""} (${fr.format(linkedSets)} séries)`}
              </button>
            ) : null}
            <p className="text-[13px] text-muted">Relancer le même import ne crée pas de doublon : une séance qui commence à la même minute est sautée.</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Séances prêtes à envoyer : seulement les exercices reliés, à l'heure locale de l'appareil. */
function toBatch(parsed: Parsed, chosen: (name: string) => string): ImportBatch {
  return parsed.workouts.flatMap((w) => {
    const exercises = w.exercises
      .map((e) => ({ exerciseId: chosen(e.name), sets: e.sets.map((s) => [s.weightKg, s.reps, s.seconds, s.warmup] as [number | null, number | null, number | null, boolean]) }))
      .filter((e) => e.exerciseId);
    if (exercises.length === 0) return [];
    const [y, m, d] = w.date.split("-").map(Number);
    const [h, min] = (w.time ?? "12:00").split(":").map(Number);
    return [{ name: w.name, date: w.date, startedAt: new Date(y, m - 1, d, h, min).toISOString(), minutes: w.minutes, exercises }];
  });
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-numeric text-[22px]">{value}</dd>
    </div>
  );
}
