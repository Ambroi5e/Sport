"use client";

import { ArrowCounterClockwiseIcon, CameraIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ChangeEvent } from "react";
import type { FormState } from "@/app/(app)/nutrition/actions";
import { buttonClasses } from "@/components/ui/button";
import { parseNutritionLabel, type LabelValues } from "@/lib/engine";
import { FoodForm } from "./food-form";

type Prefill = NonNullable<Parameters<typeof FoodForm>[0]["prefill"]>;
type Phase = { step: "photo" } | { step: "lecture"; progress: number } | { step: "verification"; values: LabelValues | null };

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, useGrouping: false });
const CORE = { kcal: "calories", proteinG: "protéines", carbsG: "glucides", fatG: "lipides" } as const;
/** Une photo de téléphone suffit largement réduite : la lecture va plus vite. */
const MAX_SIDE = 1800;

async function shrink(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Tesseract en français, dans un Web Worker, avec les fichiers servis par Fonte. */
async function readText(canvas: HTMLCanvasElement, onProgress: (p: number) => void): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("fra", 1, {
    workerPath: "/scan/tesseract/worker.min.js",
    corePath: "/scan/tesseract/core",
    langPath: "/scan/tesseract/lang",
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    // Un tableau se lit ligne par ligne : libellé puis valeurs.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Photo d'étiquette lue sur le téléphone : la photo n'est ni envoyée ni gardée.
 * Les valeurs trouvées préremplissent le formulaire, à vérifier avant d'enregistrer.
 */
export function LabelReader({
  action,
  hidden,
  base = {},
  submitLabel,
  sample,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  /** Ce qu'on sait déjà du produit (nom, marque, valeurs partielles d'Open Food Facts). */
  base?: Prefill;
  submitLabel: string;
  /** Aperçu de développement : affiche directement la vérification. */
  sample?: LabelValues;
}) {
  const [phase, setPhase] = useState<Phase>(sample ? { step: "verification", values: sample } : { step: "photo" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setPhase({ step: "lecture", progress: 0 });
    try {
      const text = await readText(await shrink(file), (progress) => setPhase({ step: "lecture", progress }));
      setPhase({ step: "verification", values: parseNutritionLabel(text) });
    } catch {
      setPhase({ step: "verification", values: null });
    }
    setAttempt((n) => n + 1);
  }

  if (phase.step === "photo") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-control border border-line bg-surface p-4 md:p-5">
          <p className="text-[15px]">
            Photographie le tableau <span className="font-semibold">Valeurs nutritionnelles</span>, bien à plat, de près et avec de la lumière.
          </p>
          <p className="text-[13px] text-muted">La lecture se fait sur ton téléphone : la photo n&apos;est ni envoyée ni gardée.</p>
          <label className={buttonClasses("primary", "lg", "w-full cursor-pointer")}>
            <CameraIcon size={20} weight="bold" aria-hidden="true" /> Prendre la photo
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
          </label>
        </div>
        <button type="button" onClick={() => setPhase({ step: "verification", values: null })} className="justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline">
          Saisir les valeurs à la main
        </button>
      </div>
    );
  }

  if (phase.step === "lecture") {
    const pct = Math.round(phase.progress * 100);
    return (
      <div className="grid gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser
          <img src={photo} alt="Étiquette en cours de lecture" className="max-h-72 w-full rounded-control border border-line object-contain" />
        ) : null}
        <div className="grid gap-2" role="status" aria-live="polite">
          <p className="text-[15px]">Lecture de l&apos;étiquette… {pct > 0 ? `${pct} %` : ""}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Lecture de l'étiquette" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
          <p className="text-[13px] text-muted">La première fois, Fonte charge de quoi lire le français : quelques secondes de plus.</p>
        </div>
      </div>
    );
  }

  const values = phase.values;
  const found = values ? (Object.keys(CORE) as (keyof typeof CORE)[]).filter((k) => values[k] !== null) : [];
  const missing = (Object.keys(CORE) as (keyof typeof CORE)[]).filter((k) => !found.includes(k) && !base[k]);
  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? undefined : decimal.format(n));
  const prefill: Prefill = {
    ...base,
    ...(values
      ? Object.fromEntries((Object.keys(CORE) as (keyof typeof CORE)[]).flatMap((k) => (values[k] === null ? [] : [[k, fmt(values[k])]])))
      : {}),
  };
  const tried = photo !== null || sample !== undefined;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-8">
      <div className="grid content-start gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser
          <img src={photo} alt="Étiquette prise, pour comparer avec les valeurs lues" className="max-h-80 w-full rounded-control border border-line object-contain" />
        ) : null}
        {tried ? (
          <div className="grid gap-1.5 rounded-control border border-line bg-surface p-4" role="status">
            <p className="text-[15px] font-medium">
              {found.length === 0 ? "Fonte n'a pas réussi à lire l'étiquette." : `${found.length} valeur${found.length > 1 ? "s" : ""} lue${found.length > 1 ? "s" : ""} sur 4 : vérifie-les avec l'étiquette.`}
            </p>
            {missing.length && found.length ? <p className="text-[14px] text-muted">À compléter : {missing.map((k) => CORE[k]).join(", ")}.</p> : null}
            {values?.kcalEstimated ? <p className="text-[14px] text-muted">Calories absentes de la photo : déduites des macros, à corriger si l&apos;étiquette les donne.</p> : null}
            {found.length === 0 ? <p className="text-[14px] text-muted">Reprends la photo plus près, bien droite et éclairée, ou saisis les valeurs.</p> : null}
          </div>
        ) : null}
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 justify-self-start text-[14px] font-medium text-accent-text underline-offset-4 hover:underline">
          <ArrowCounterClockwiseIcon size={16} aria-hidden="true" /> {tried ? "Reprendre la photo" : "Prendre une photo de l'étiquette"}
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
        </label>
      </div>
      <FoodForm key={attempt} action={action} hidden={hidden} prefill={prefill} submitLabel={submitLabel} />
    </div>
  );
}
