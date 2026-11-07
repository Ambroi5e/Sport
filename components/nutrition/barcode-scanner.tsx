"use client";

import { CameraSlashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { isValidBarcode } from "@/lib/engine";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type Status = "demarrage" | "scan" | "trouve" | "refuse" | "indisponible";

/** Codes des produits en magasin. UPC-E (clé calculée autrement) n'est pas lu. */
const FORMATS = ["ean_13", "ean_8", "upc_a"];

/**
 * Le détecteur du navigateur s'il lit ces codes (Chrome sur Android), sinon le même
 * standard en WebAssembly, servi par Fonte et chargé seulement maintenant (Safari).
 */
async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[]);
    const formats = FORMATS.filter((f) => supported.includes(f));
    if (formats.length) return new Native({ formats });
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/scan/${path}` : prefix + path) } });
  return new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
}

/**
 * Scan en direct avec la caméra arrière ; un code valide ouvre la fiche du produit.
 * Sans caméra (refusée, absente), les chiffres se tapent à la main.
 */
export function BarcodeScanner({ query }: { query: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("demarrage");
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);

  const open = (code: string) => router.push(`/nutrition/code/${code}${query ? `?${query}` : ""}`);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("indisponible");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      if (stopped || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      const detector = await createDetector();
      if (stopped) return;
      setStatus("scan");
      const tick = async () => {
        if (stopped || !video.current) return;
        const codes = await detector.detect(video.current).catch(() => []);
        const code = codes.map((c) => c.rawValue).find(isValidBarcode);
        if (code) {
          stopped = true;
          navigator.vibrate?.(40);
          setStatus("trouve");
          router.push(`/nutrition/code/${code}${query ? `?${query}` : ""}`);
          return;
        }
        timer = setTimeout(tick, 120);
      };
      void tick();
    }

    start().catch((error: unknown) => {
      if (!stopped) setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "refuse" : "indisponible");
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [query, router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = typed.replace(/\D/g, "");
    if (!isValidBarcode(code)) {
      setTypedError("Ce code ne semble pas complet : recopie les 8 ou 13 chiffres sous les barres.");
      return;
    }
    open(code);
  }

  const camera = status === "demarrage" || status === "scan" || status === "trouve";

  return (
    <div className="grid gap-6">
      {camera ? (
        <div className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-control border border-line bg-surface-2">
          <video ref={video} muted playsInline className="size-full object-cover" aria-hidden="true" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[38%] -translate-y-1/2 rounded-control border-2 border-accent shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
        </div>
      ) : (
        <div className="grid justify-items-center gap-2 rounded-control border border-line bg-surface p-6 text-center">
          <CameraSlashIcon size={28} className="text-muted" aria-hidden="true" />
          <p className="text-[15px] font-medium">{status === "refuse" ? "Caméra refusée" : "Caméra indisponible"}</p>
          <p className="max-w-sm text-[14px] text-muted">
            {status === "refuse"
              ? "Autorise la caméra pour Fonte dans les réglages du navigateur, ou tape les chiffres du code ci-dessous."
              : "Ce navigateur ne donne pas accès à la caméra. Tape les chiffres du code ci-dessous."}
          </p>
        </div>
      )}
      <p className="text-center text-[14px] text-muted" role="status" aria-live="polite">
        {status === "demarrage" ? "Ouverture de la caméra…" : status === "scan" ? "Place le code-barres dans le cadre, bien à plat." : status === "trouve" ? "Code lu, recherche du produit…" : ""}
      </p>

      <form onSubmit={submit} className="grid gap-3" noValidate>
        <Field
          id="code"
          label="Ou tape les chiffres du code"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={14}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setTypedError(null);
          }}
          error={typedError}
        />
        <Button type="submit" variant="secondary" className="w-full sm:w-auto sm:justify-self-start">
          Chercher
        </Button>
      </form>
    </div>
  );
}
