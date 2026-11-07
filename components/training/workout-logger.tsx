"use client";

import { CheckIcon, MinusIcon, PlusIcon, TrophyIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { deleteSet, removeExerciseFromWorkout, saveSet } from "@/app/(app)/entrainement/actions";
import { cn } from "@/components/ui/cn";
import { kgTo, newRecords, toKg, type ExerciseRecords, type RecordKind, type WeightUnit } from "@/lib/engine";
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
  persisted: boolean;
  saving: boolean;
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
    persisted: true,
    saving: false,
    error: null,
    records: [],
  };
}

/**
 * Saisie d'une séance : chaque série est préremplie et se valide en un tap.
 * Chaque validation est enregistrée tout de suite, avec un identifiant créé
 * sur le téléphone (pas de doublon si on renvoie).
 */
export function WorkoutLogger({
  workoutId,
  blocks: initialBlocks,
  history,
  unit,
  finished,
}: {
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

  function patchRow(order: number, rowId: string, patch: Partial<Row>) {
    setBlocks((prev) =>
      prev.map((b) => (b.order === order ? { ...b, rows: b.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : b)),
    );
  }

  function patchBlock(order: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.order === order ? { ...b, ...patch } : b)));
  }

  async function persist(block: Block, row: Row, done: boolean) {
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

    patchRow(block.order, row.id, { done, saving: true, error: null, records });
    if (records.length > 0) setAnnounce(`${block.exercise.name} : ${RECORD_TEXT[records[0]].toLowerCase()} !`);
    if (done && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(records.length ? [20, 60, 20] : 15);

    const result = await saveSet({
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
    });
    patchRow(block.order, row.id, result.ok ? { saving: false, persisted: true } : { saving: false, done: row.done, records: row.records, error: result.error ?? null });
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
      persisted: false,
      saving: false,
      error: null,
      records: [],
    };
    patchBlock(block.order, { rows: [...block.rows, row] });
  }

  async function removeLastRow(block: Block) {
    const last = block.rows.at(-1);
    if (!last) return;
    patchBlock(block.order, { rows: block.rows.slice(0, -1) });
    if (last.persisted) await deleteSet(last.id);
  }

  async function removeBlock(block: Block) {
    setBlocks((prev) => prev.filter((b) => b.order !== block.order));
    await removeExerciseFromWorkout(workoutId, block.order);
  }

  const doneRows = blocks.flatMap((b) => b.rows.filter((r) => r.done && !r.isWarmup));

  return (
    <div className="grid gap-4">
      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>
      <p className="text-[15px] text-muted">
        <span className="font-numeric text-[22px] text-text">{doneRows.length}</span> série{doneRows.length > 1 ? "s" : ""} validée
        {doneRows.length > 1 ? "s" : ""}
      </p>

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
                      aria-label={row.done ? `Annuler la validation de la série ${row.setNumber}` : `Valider la série ${row.setNumber}`}
                      className={cn(
                        "grid size-12 place-items-center rounded-control border transition-[transform,background-color] duration-[120ms] active:scale-95",
                        row.done ? "border-success bg-success text-bg" : "border-line bg-surface-2 text-muted hover:text-text",
                        row.saving && "opacity-70",
                      )}
                    >
                      <CheckIcon size={22} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  {row.records.length ? (
                    <p className="pl-9 text-[13px] font-medium text-warning">{RECORD_TEXT[row.records[0]]}</p>
                  ) : null}
                  {row.error ? (
                    <p role="alert" className="pl-9 text-[13px] text-danger">
                      {row.error}
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

      <Link
        href={`/entrainement/seance/${workoutId}/ajouter`}
        className="flex h-14 items-center justify-center gap-2 rounded-control border border-dashed border-line text-[15px] font-semibold text-text hover:bg-surface"
      >
        <PlusIcon size={20} weight="bold" aria-hidden="true" /> Ajouter un exercice
      </Link>
      {finished ? null : <p className="text-center text-[13px] text-muted">Chaque série validée est enregistrée tout de suite.</p>}
    </div>
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
