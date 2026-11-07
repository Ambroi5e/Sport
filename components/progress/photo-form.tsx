"use client";

import { CameraIcon } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/(app)/progres/actions";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PHOTO_MAX_SIDE, PHOTO_POSES, POSE_LABELS } from "@/lib/body";

/** Sous la limite d'1 Mo du bucket et des Server Actions, avec de la marge. */
const TARGET_BYTES = 900_000;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    URL.revokeObjectURL(img.src);
    return img;
  }
}

/**
 * Réduit la photo à 1 600 px de côté et la réencode en JPEG. Le dessin sur un
 * canevas ne garde que les pixels : les métadonnées EXIF, dont la position GPS,
 * ne partent jamais du téléphone.
 */
async function compress(file: File): Promise<File> {
  const image = await decode(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ("close" in image) image.close();
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= TARGET_BYTES) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  }
  throw new Error("too_big");
}

const sizeFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function PhotoForm({
  action,
  today,
  minDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  today: string;
  minDate: string;
}) {
  const photo = useRef<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    if (!photo.current) return { error: "Choisis une photo.", values: { pose: String(formData.get("pose") ?? ""), date: String(formData.get("date") ?? "") } };
    formData.set("photo", photo.current);
    return action(prev, formData);
  }, {} as FormState);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview.url) : undefined), [preview]);

  async function onFile(file: File | undefined) {
    setProblem(null);
    photo.current = null;
    setPreview(null);
    if (!file) return;
    setBusy(true);
    try {
      const small = await compress(file);
      const bitmap = await createImageBitmap(small);
      photo.current = small;
      setPreview({ url: URL.createObjectURL(small), width: bitmap.width, height: bitmap.height, size: small.size });
      bitmap.close();
    } catch {
      setProblem("Cette image n'a pas pu être lue. Essaie une photo JPEG, PNG ou HEIC prise avec ton téléphone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <ChoiceGroup
        name="pose"
        legend="Pose"
        columns={3}
        defaultValue={state.values?.pose || "face"}
        options={PHOTO_POSES.map((p) => ({ value: p, label: POSE_LABELS[p] }))}
      />
      <Field id="date" name="date" type="date" label="Date" defaultValue={state.values?.date || today} max={today} min={minDate} required className="max-w-60" />

      <div className="grid gap-2">
        <label
          htmlFor="photo"
          className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-line bg-surface-2 px-4 text-[15px] font-semibold transition-colors hover:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
        >
          <CameraIcon size={22} aria-hidden="true" />
          {preview ? "Changer de photo" : "Prendre ou choisir une photo"}
          <input id="photo" type="file" accept="image/*" className="sr-only" aria-describedby="photo-aide" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p id="photo-aide" aria-live="polite" className="text-[13px] text-muted">
          {busy
            ? "Réduction de la photo…"
            : preview
              ? `Prête : ${preview.width} × ${preview.height} px, ${sizeFormat.format(preview.size / 1000)} Ko, sans métadonnées ni position GPS.`
              : "La photo est réduite et nettoyée de ses métadonnées (dont la position GPS) sur ton téléphone, avant l'envoi."}
        </p>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), rien à optimiser
          <img src={preview.url} alt="Aperçu avant envoi" className="max-h-96 w-auto justify-self-start rounded-control border border-line" />
        ) : null}
      </div>

      {problem || state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {problem ?? state.error}
        </p>
      ) : null}
      <SubmitButton size="lg" className="w-full sm:w-auto" disabled={busy || !preview} pendingLabel="Envoi…">
        Enregistrer la photo
      </SubmitButton>
    </form>
  );
}
