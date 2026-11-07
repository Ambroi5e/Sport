"use client";

import { CheckIcon, CloudSlashIcon, MinusIcon, PlusIcon, SunIcon, TrophyIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SetInput } from "@/app/(app)/entrainement/actions";
import { startRest, stopRest } from "@/components/training/rest-timer";
import { queueDeleteSet, queueRemoveExercise, queueSaveSet, registerSessionSenders, setKey, type SessionOp } from "@/components/training/set-sync";
import { useWakeLock, useWakeLockSupported } from "@/components/training/use-wake-lock";
import { cn } from "@/components/ui/cn";
import { kgTo, newRecords, toKg, type ExerciseRecords, type RecordKind, type WeightUnit } from "@/lib/engine";
import { onDrained, pendingIn, useOnline, useOutbox, type Entry, type Notice } from "@/lib/offline/outbox";
import { forgetSessionCopy, keepSessionCopy } from "@/lib/offline/session-copy";
import { setPrefs, usePrefs } from "@/lib/session-prefs";
import { formatSet, type ExerciseMeasure } from "@/lib/training";

export type LoggerSet = {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  repMin: number | null;
  repMax: number | null;
  isWarmup: boolean;
  done: boolean;
  /** Heure de validation, ISO. */
  completedAt: string | null;
};

export type LoggerBlock = {
  order: number;
  exercise: { id: string; name: string; measure: ExerciseMeasure };
  sets: LoggerSet[];
};

export type LoggerHistory = Record<
  string,
  { records: ExerciseRecords; last: { weightKg: number | null; reps: number | null; durationSeconds: number | null }[]; lastDate: string | null }
>;

type Row = {
  id: string;
  setNumber: number;
  weight: string;
  reps: string;
  duration: string;
  repMin: number | null;
  repMax: number | null;
  isWarmup: boolean;
  done: boolean;
  completedAt: string | null;
  /** Déjà enregistrée ou mise en file : la retirer demande une suppression. */
  persisted: boolean;
  error: string | null;
  records: RecordKind[];
};

type Block = { order: number; exercise: LoggerBlock["exercise"]; rows: Row[]; confirmRemove: boolean };

const RECORD_TEXT: Record<RecordKind, string> = {
  e1rm: "Record de 1RM estimé",
  charge: "Record de charge",
  reps: "Record de répétitions",
  duree: "Record de durée",
};

const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

function display(value: number | null, digits = 1): string {
  if (value === null) return "";
  return String(Math.round(value * 10 ** digits) / 10 ** digits).replace(".", ",");
}

function parse(text: string): number | null {
  const n = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toRow(s: LoggerSet, unit: WeightUnit): Row {
  return {
    id: s.id,
    setNumber: s.setNumber,
    weight: s.weightKg === null ? "" : display(kgTo(unit, s.weightKg)),
    reps: s.reps === null ? "" : String(s.reps),
    duration: s.durationSeconds === null ? "" : String(s.durationSeconds),
    repMin: s.repMin,
    repMax: s.repMax,
    isWarmup: s.isWarmup,
    done: s.done,
    completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    persisted: true,
    error: null,
    records: [],
  };
}

/**
 * Réapplique les opérations encore en attente sur le téléphone, pour qu'une
 * séance rouverte (ou rechargée hors ligne) montre ce qui a vraiment été saisi.
 */
function applyPending(blocks: Block[], entries: Entry[]): Block[] {
  let out = blocks;
  for (const entry of entries) {
    const op = entry.payload as SessionOp;
    if (op.kind === "exercise.remove") {
      out = out.filter((b) => b.order !== op.data.order);
    } else if (op.kind === "set.delete") {
      out = out.map((b) => ({ ...b, rows: b.rows.filter((r) => r.id !== op.data.id) }));
    } else if (op.kind === "set.save") {
      const d = op.data;
      const values = {
        weight: d.weight === null ? "" : display(d.weight, 2),
        reps: d.reps === null ? "" : String(d.reps),
        duration: d.durationSeconds === null ? "" : String(d.durationSeconds),
        done: d.done,
        completedAt: d.completedAt,
        persisted: true,
      };
      out = out.map((b) => {
        if (b.order !== d.exerciseOrder) return b;
        if (b.rows.some((r) => r.id === d.id)) return { ...b, rows: b.rows.map((r) => (r.id === d.id ? { ...r, ...values } : r)) };
        const row: Row = { id: d.id, setNumber: d.setNumber, repMin: d.repMin, repMax: d.repMax, isWarmup: d.isWarmup, error: null, records: [], ...values };
        return { ...b, rows: [...b.rows, row].sort((x, y) => x.setNumber - y.setNumber) };
      });
    }
  }
  return out;
}

/**
 * Saisie d'une séance : chaque série est préremplie et se valide en un tap.
 * Chaque saisie passe par la file d'attente du téléphone : l'écran se met à
 * jour tout de suite, et l'envoi se fait dès que le réseau le permet, avec un
 * identifiant créé sur le téléphone (pas de doublon si on renvoie).
 */
export function WorkoutLogger({
  userId,
  workoutId,
  blocks: initialBlocks,
  history,
  unit,
  finished,
}: {
  userId: string;
  workoutId: string;
  blocks: LoggerBlock[];
  history: LoggerHistory;
  unit: WeightUnit;
  finished: boolean;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialBlocks.map((b) => ({ order: b.order, exercise: b.exercise, rows: b.sets.map((s) => toRow(s, unit)), confirmRemove: false })),
  );
  const [announce, setAnnounce] = useState("");
  const outbox = useOutbox();
  const online = useOnline();
  const prefs = usePrefs();
  const wakeLockSupported = useWakeLockSupported();
  useWakeLock(!finished && prefs.keepAwake);

  useEffect(() => {
    registerSessionSenders();
    const pending = pendingIn(userId, workoutId);
    // Synchronisation avec le stockage du téléphone, lisible seulement après le rendu serveur.
    // oxlint-disable-next-line react/set-state-in-effect
    if (pending.length) setBlocks((prev) => applyPending(prev, pending));
  }, [userId, workoutId]);

  // Copie hors ligne de la séance en cours, rafraîchie quand tout est parti ; effacée une fois la séance terminée.
  useEffect(() => {
    const path = `/entrainement/seance/${workoutId}`;
    if (finished) {
      forgetSessionCopy(path);
      stopRest(workoutId);
      return;
    }
    // Rechargée à l'ouverture : un exercice ajouté depuis la dernière copie doit y figurer.
    keepSessionCopy(path, true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onDrained(() => {
      clearTimeout(timer);
      timer = setTimeout(() => keepSessionCopy(path, true), 1500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [workoutId, finished]);

  const pendingKeys = new Set(outbox.pending.filter((e) => e.scope === workoutId).map((e) => e.key));
  const pendingSets = blocks.reduce((n, b) => n + b.rows.filter((r) => pendingKeys.has(setKey(r.id))).length, 0);

  function patchRow(order: number, rowId: string, patch: Partial<Row>) {
    setBlocks((prev) =>
      prev.map((b) => (b.order === order ? { ...b, rows: b.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : b)),
    );
  }

  function patchBlock(order: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.order === order ? { ...b, ...patch } : b)));
  }

  function persist(block: Block, row: Row, done: boolean) {
    const measure = block.exercise.measure;
    const reps = measure === "duree" ? null : parse(row.reps);
    const duration = measure === "duree" ? parse(row.duration) : null;
    const weight = parse(row.weight);

    if (done && measure !== "duree" && (reps === null || reps < 1)) {
      patchRow(block.order, row.id, { error: "Indique le nombre de répétitions." });
      return;
    }
    if (done && measure === "duree" && (duration === null || duration < 1)) {
      patchRow(block.order, row.id, { error: "Indique la durée en secondes." });
      return;
    }

    const records = done
      ? newRecords(history[block.exercise.id]?.records ?? emptyRecords, {
          exerciseId: block.exercise.id,
          workoutId,
          date: "",
          weightKg: weight === null ? null : toKg(unit, weight),
          reps,
          durationSeconds: duration,
          isWarmup: row.isWarmup,
        })
      : [];
    // Une série modifiée après validation garde son heure de validation.
    const completedAt = done ? (row.done && row.completedAt ? row.completedAt : new Date().toISOString()) : null;

    patchRow(block.order, row.id, { done, completedAt, persisted: true, error: null, records });
    if (records.length > 0) setAnnounce(`${block.exercise.name} : ${RECORD_TEXT[records[0]].toLowerCase()} !`);
    if (done && !row.done) {
      if ("vibrate" in navigator) navigator.vibrate(records.length ? [20, 60, 20] : 15);
      if (!finished) startRest({ workoutId, exerciseId: block.exercise.id, exerciseName: block.exercise.name });
    }

    const input: SetInput = {
      id: row.id,
      workoutId,
      exerciseId: block.exercise.id,
      exerciseOrder: block.order,
      setNumber: row.setNumber,
      weight,
      reps: reps === null ? null : Math.round(reps),
      durationSeconds: duration === null ? null : Math.round(duration),
      repMin: row.repMin,
      repMax: row.repMax,
      isWarmup: row.isWarmup,
      done,
      completedAt,
    };
    queueSaveSet(userId, input);
  }

  function addRow(block: Block) {
    const last = block.rows.at(-1);
    const row: Row = {
      id: crypto.randomUUID(),
      setNumber: (last?.setNumber ?? 0) + 1,
      weight: last?.weight ?? "",
      reps: last?.reps ?? "",
      duration: last?.duration ?? "",
      repMin: last?.repMin ?? null,
      repMax: last?.repMax ?? null,
      isWarmup: false,
      done: false,
      completedAt: null,
      persisted: false,
      error: null,
      records: [],
    };
    patchBlock(block.order, { rows: [...block.rows, row] });
  }

  function removeLastRow(block: Block) {
    const last = block.rows.at(-1);
    if (!last) return;
    patchBlock(block.order, { rows: block.rows.slice(0, -1) });
    if (last.persisted) queueDeleteSet(userId, workoutId, last.id);
  }

  function removeBlock(block: Block) {
    setBlocks((prev) => prev.filter((b) => b.order !== block.order));
    queueRemoveExercise(userId, workoutId, block.order);
  }

  const doneRows = blocks.flatMap((b) => b.rows.filter((r) => r.done && !r.isWarmup));

  return (
    <div className="grid gap-4">
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-muted">
          <span className="font-numeric text-[22px] text-text">{doneRows.length}</span> série{doneRows.length > 1 ? "s" : ""} validée
          {doneRows.length > 1 ? "s" : ""}
        </p>
        {!finished && wakeLockSupported ? (
          <button
            type="button"
            onClick={() => setPrefs({ keepAwake: !prefs.keepAwake })}
            aria-pressed={prefs.keepAwake}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-control border px-3 text-[13px] font-medium",
              prefs.keepAwake ? "border-accent-text/60 text-text" : "border-line text-muted",
            )}
          >
            <SunIcon size={16} weight={prefs.keepAwake ? "fill" : "regular"} className={prefs.keepAwake ? "text-accent-text" : undefined} aria-hidden="true" />
            Écran allumé
          </button>
        ) : null}
      </div>
      <SyncStatus online={online} pending={pendingSets} notice={outbox.notice} />

      {blocks.map((block) => {
        const h = history[block.exercise.id];
        const target = block.rows.find((r) => r.repMin !== null);
        const measure = block.exercise.measure;
        const weightLabel = measure === "charge" ? unit : `lest (${unit})`;
        return (
          <section key={block.order} id={`exercice-${block.order}`} aria-labelledby={`ex-${block.order}`} className="scroll-mt-4 rounded-control border border-line bg-surface p-4 shadow-card">
            <header className="grid gap-1">
              <h2 id={`ex-${block.order}`} className="text-lg font-semibold">
                {block.exercise.name}
              </h2>
              {target?.repMin ? (
                <p className="text-[13px] text-muted">
                  Objectif {block.rows.length} × {target.repMin}
                  {target.repMax && target.repMax !== target.repMin ? `–${target.repMax}` : ""} reps
                </p>
              ) : null}
              {h?.last.length ? (
                <p className="text-[13px] text-muted">
                  Dernière fois{h.lastDate ? ` (${shortDate.format(new Date(`${h.lastDate}T00:00:00Z`))})` : ""} :{" "}
                  {h.last.map((s) => formatSet(s, unit)).join(", ")}
                </p>
              ) : (
                <p className="text-[13px] text-muted">Première fois : tes valeurs serviront de référence.</p>
              )}
            </header>

            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-[28px_1fr_1fr_48px] gap-2 px-0.5 text-[12px] font-medium text-muted" aria-hidden="true">
                <span>Série</span>
                {measure === "duree" ? <span className="col-span-2">Durée (s)</span> : <><span>{weightLabel}</span><span>Reps</span></>}
                <span />
              </div>
              {block.rows.map((row) => (
                <div key={row.id} className="grid gap-1">
                  <div className="grid grid-cols-[28px_1fr_1fr_48px] items-center gap-2">
                    <span className="font-numeric text-center text-[20px] text-muted">
                      {row.records.length ? <TrophyIcon size={20} weight="fill" className="mx-auto text-warning" aria-label="Record" /> : row.setNumber}
                    </span>
                    {measure === "duree" ? (
                      <NumberInput
                        className="col-span-2"
                        label={`Série ${row.setNumber}, durée en secondes`}
                        value={row.duration}
                        inputMode="numeric"
                        done={row.done}
                        onChange={(v) => patchRow(block.order, row.id, { duration: v })}
                        onCommit={() => row.done && persist(block, row, true)}
                      />
                    ) : (
                      <>
                        <NumberInput
                          label={`Série ${row.setNumber}, ${measure === "charge" ? "charge" : "lest"} en ${unit}`}
                          value={row.weight}
                          inputMode="decimal"
                          placeholder={measure === "charge" ? "" : "0"}
                          done={row.done}
                          onChange={(v) => patchRow(block.order, row.id, { weight: v })}
                          onCommit={() => row.done && persist(block, row, true)}
                        />
                        <NumberInput
                          label={`Série ${row.setNumber}, répétitions`}
                          value={row.reps}
                          inputMode="numeric"
                          done={row.done}
                          onChange={(v) => patchRow(block.order, row.id, { reps: v })}
                          onCommit={() => row.done && persist(block, row, true)}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => persist(block, row, !row.done)}
                      aria-pressed={row.done}
                      aria-label={
                        row.done
                          ? `Annuler la validation de la série ${row.setNumber}${pendingKeys.has(setKey(row.id)) ? " (en attente d'envoi)" : ""}`
                          : `Valider la série ${row.setNumber}`
                      }
                      className={cn(
                        "grid size-12 place-items-center rounded-control border transition-[transform,background-color] duration-[120ms] active:scale-95",
                        row.done ? "border-success bg-success text-bg" : "border-line bg-surface-2 text-muted hover:text-text",
                      )}
                    >
                      <CheckIcon size={22} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  {row.records.length ? (
                    <p className="pl-9 text-[13px] font-medium text-warning">{RECORD_TEXT[row.records[0]]}</p>
                  ) : null}
                  {row.error || outbox.rejected[setKey(row.id)] ? (
                    <p role="alert" className="pl-9 text-[13px] text-danger">
                      {row.error ?? outbox.rejected[setKey(row.id)]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addRow(block)}
                className="inline-flex h-11 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 text-sm font-medium"
              >
                <PlusIcon size={16} weight="bold" aria-hidden="true" /> Série
              </button>
              {block.rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLastRow(block)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 text-sm font-medium"
                  aria-label={`Retirer la dernière série de ${block.exercise.name}`}
                >
                  <MinusIcon size={16} weight="bold" aria-hidden="true" /> Série
                </button>
              ) : null}
              <span className="flex-1" />
              {block.confirmRemove ? (
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => removeBlock(block)} className="h-11 rounded-control px-3 text-sm font-semibold text-danger">
                    Retirer l&apos;exercice
                  </button>
                  <button type="button" onClick={() => patchBlock(block.order, { confirmRemove: false })} className="h-11 rounded-control px-3 text-sm text-muted">
                    Annuler
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => patchBlock(block.order, { confirmRemove: true })} className="h-11 rounded-control px-3 text-sm text-muted hover:text-text">
                  Retirer
                </button>
              )}
            </div>
          </section>
        );
      })}

      {online ? (
        <Link
          href={`/entrainement/seance/${workoutId}/ajouter`}
          className="flex h-14 items-center justify-center gap-2 rounded-control border border-dashed border-line text-[15px] font-semibold text-text hover:bg-surface"
        >
          <PlusIcon size={20} weight="bold" aria-hidden="true" /> Ajouter un exercice
        </Link>
      ) : (
        <p className="flex h-14 items-center justify-center gap-2 rounded-control border border-dashed border-line px-3 text-center text-[14px] text-muted">
          Ajouter un exercice demande du réseau.
        </p>
      )}
      {finished ? null : (
        <p className="text-center text-[13px] text-muted">Chaque série validée est gardée sur le téléphone puis envoyée, même sans réseau.</p>
      )}
    </div>
  );
}

/** Ce qui n'est pas encore parti, dit seulement quand ça dure (pas à chaque tap). */
function SyncStatus({ online, pending, notice }: { online: boolean; pending: number; notice: Notice | null }) {
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (pending === 0) return;
    const timer = setTimeout(() => setLingering(true), 2000);
    return () => {
      clearTimeout(timer);
      setLingering(false);
    };
  }, [pending]);

  const series = `${pending} série${pending > 1 ? "s" : ""}`;
  let text: string | null = null;
  if (!online) text = pending ? `Hors ligne : ${series} gardée${pending > 1 ? "s" : ""} sur le téléphone, envoi au retour du réseau.` : "Hors ligne : tes séries seront gardées sur le téléphone.";
  else if (pending && notice) text = notice.text;
  else if (pending && lingering) text = `${series} en attente d'envoi…`;

  return (
    <p role="status" className={cn("flex items-start gap-2 rounded-control text-[14px]", text ? "border border-line bg-surface-2 px-3 py-2.5 text-text" : "sr-only")}>
      {text ? (
        <>
          <CloudSlashIcon size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {text}
            {online && pending && notice?.reconnect ? (
              <>
                {" "}
                <Link href="/connexion" className="font-semibold text-accent-text underline underline-offset-2">
                  Me reconnecter
                </Link>
              </>
            ) : null}
          </span>
        </>
      ) : null}
    </p>
  );
}

const emptyRecords: ExerciseRecords = { bestE1RM: null, heaviest: null, mostReps: null, longest: null, bestSessionVolume: null };

function NumberInput({
  label,
  value,
  inputMode,
  placeholder,
  done,
  className,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  inputMode: "decimal" | "numeric";
  placeholder?: string;
  done: boolean;
  className?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
      onBlur={onCommit}
      onFocus={(e) => e.target.select()}
      className={cn(
        "font-numeric h-12 w-full min-w-0 rounded-control border bg-surface-2 px-2 text-center text-[24px] text-text placeholder:text-muted focus:border-accent focus:outline-none",
        done ? "border-success/50" : "border-line",
        className,
      )}
    />
  );
}
