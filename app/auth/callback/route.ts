import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour de Google via Supabase : ?code=… à échanger contre une session.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  // Compte Google sans compte Fonte ni invitation réservée : le déclencheur
  // d'inscription a refusé la création, Supabase renvoie « Database error ».
  const description = searchParams.get("error_description") ?? "";
  const reason = /database error/i.test(description) ? "google-sans-compte" : "google";
  return NextResponse.redirect(new URL(`/connexion?erreur=${reason}`, request.url));
}
