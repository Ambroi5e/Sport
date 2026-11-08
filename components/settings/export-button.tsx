"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { PhotoLink } from "@/app/(app)/reglages/donnees/data";
import { Button } from "@/components/ui/button";
import { archiveEntries, exportDay, photoFileName } from "@/lib/export/archive";
import type { FonteExport } from "@/lib/export/tables";
import { createZip } from "@/lib/export/zip";

type State =
  | { step: "idle" }
  | { step: "working"; message: string }
  | { step: "done"; file: string; bytes: number; missing: number }
  | { step: "error"; message: string };

/** Photos téléchargées 4 par 4 : assez pour aller vite, sans saturer un réseau mobile. */
const PARALLEL = 4;

function size(bytes: number): string {
  const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  return bytes < 1_000_000 ? `${fmt.format(Math.max(1, bytes / 1000))} ko` : `${fmt.format(bytes / 1_000_000)} Mo`;
}

/** Session expirée : le serveur renvoie vers la connexion au lieu du JSON. */
async function readJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.redirected) throw new Error("Ta session a expiré : reconnecte-toi, puis recommence.");
  if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) throw new Error("Fonte n'a pas pu lire tes données. Réessaie.");
  return (await res.json()) as T;
}

function save(data: Uint8Array<ArrayBuffer>, file: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
  // Laisser au navigateur le temps de lancer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Archive complète construite sur le téléphone : le serveur donne les données
 * (JSON) et des liens signés vers les photos, que le téléphone télécharge
 * lui-même. Rien n'est gardé ailleurs que dans le fichier final.
 */
export function ExportButton() {
  const [state, setState] = useState<State>({ step: "idle" });

  async function run() {
    setState({ step: "working", message: "Lecture de tes données…" });
    try {
      const data = await readJson<FonteExport>("/reglages/donnees/export");
      const { photos: links } = await readJson<{ photos: PhotoLink[] }>("/reglages/donnees/photos");
      const photos: { name: string; data: Uint8Array }[] = [];
      let missing = 0;
      let next = 0;
      const worker = async () => {
        while (next < links.length) {
          const link = links[next++];
          try {
            const photo = await fetch(link.url, { cache: "no-store" });
            if (!photo.ok) throw new Error();
            photos.push({ name: photoFileName(link), data: new Uint8Array(await photo.arrayBuffer()) });
          } catch {
            missing += 1;
          }
          setState({ step: "working", message: `Photos : ${photos.length + missing} sur ${links.length}…` });
        }
      };
      if (links.length) {
        setState({ step: "working", message: `Photos : 0 sur ${links.length}…` });
        await Promise.all(Array.from({ length: Math.min(PARALLEL, links.length) }, worker));
      }
      photos.sort((a, b) => a.name.localeCompare(b.name));

      setState({ step: "working", message: "Création de l'archive…" });
      const now = new Date();
      const day = exportDay(now);
      const zip = createZip(archiveEntries(data, photos, missing, day), now);
      const file = `fonte-${day}.zip`;
      save(zip, file);
      setState({ step: "done", file, bytes: zip.length, missing });
    } catch (error) {
      setState({ step: "error", message: error instanceof Error && error.message ? error.message : "L'export a échoué. Réessaie." });
    }
  }

  const working = state.step === "working";
  return (
    <div className="grid gap-3">
      <Button size="lg" onClick={run} disabled={working} aria-busy={working || undefined} className="w-full sm:w-auto sm:justify-self-start">
        <DownloadSimpleIcon size={20} weight="bold" aria-hidden="true" />
        {working ? "Préparation…" : state.step === "done" ? "Télécharger à nouveau" : "Télécharger mon archive"}
      </Button>
      <div role="status" aria-live="polite" className="text-[14px]">
        {state.step === "working" ? <p className="text-muted">{state.message}</p> : null}
        {state.step === "done" ? (
          <div className="grid gap-1">
            <p>
              Archive prête : <span className="font-medium">{state.file}</span> ({size(state.bytes)}), dans tes téléchargements.
            </p>
            {state.missing > 0 ? (
              <p className="text-warning">
                {state.missing} photo{state.missing > 1 ? "s n'ont" : " n'a"} pas pu être ajoutée{state.missing > 1 ? "s" : ""} (réseau). Recommence
                pour les avoir.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {state.step === "error" ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
