"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

/** Filet de sécurité quand le temps réel est coupé : on recharge quand même, tant que l'écran est visible. */
const FALLBACK_MS = 15_000;

/**
 * Tient le tableau d'une séance commune à jour : à chaque série d'un participant
 * (temps réel Supabase, filtré par la RLS) et, au pire, toutes les 15 secondes.
 * N'affiche rien : il demande au serveur de redessiner la page.
 */
export function LiveRefresh({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, FALLBACK_MS);
    document.addEventListener("visibilitychange", refresh);

    const supabase = createClient();
    const filter = `session_id=eq.${sessionId}`;
    const channel = supabase
      .channel(`seance-commune-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_events", filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_participants", filter }, refresh)
      .subscribe();

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [router, sessionId]);

  return null;
}
