import "server-only";
import { env } from "@/lib/env";

/**
 * Le bouton Google n'apparaît que si le fournisseur est activé dans Supabase :
 * tant que les réglages Google ne sont pas faits, rien ne change pour personne.
 * Réponse mise en cache 5 minutes.
 */
export async function isGoogleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
