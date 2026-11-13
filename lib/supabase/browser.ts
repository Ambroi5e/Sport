import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Client Supabase dans le navigateur, au nom de la personne connectée (cookies de
 * session, clé publique). Il ne sert qu'à écouter le temps réel des séances
 * communes : lectures et écritures passent par le serveur.
 */
export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
