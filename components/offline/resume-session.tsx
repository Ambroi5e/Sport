"use client";

import { useEffect, useState } from "react";
import { SESSION_CACHE } from "@/lib/offline/session-copy";

/** Lien vers la séance en cours gardée par le service worker, s'il y en a une. */
export function ResumeSession() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    if (!("caches" in window)) return;
    caches
      .open(SESSION_CACHE)
      .then((cache) => cache.keys())
      .then((keys) => setPath(keys[0] ? new URL(keys[0].url).pathname : null))
      .catch(() => {});
  }, []);

  if (!path) return null;
  return (
    <div className="grid gap-2 rounded-control border border-line bg-surface p-4">
      <p className="text-[15px]">Ta séance en cours est gardée sur le téléphone : tu peux continuer à valider tes séries.</p>
      {/* Rechargement complet voulu : le service worker sert la copie gardée. */}
      {/* oxlint-disable-next-line nextjs/no-html-link-for-pages */}
      <a href={path} className="justify-self-start rounded-control bg-accent px-5 py-3 font-semibold text-on-accent">
        Reprendre ma séance
      </a>
    </div>
  );
}
