import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

// Pages accessibles sans être connecté.
const PUBLIC_PATHS = ["/connexion", "/inscription", "/auth/confirm", "/auth/callback", "/hors-ligne", "/confidentialite", "/compte-supprime"];

function isPublic(pathname: string) {
  // Aperçu avec données d'exemple, réservé au développement (la page renvoie 404 en production).
  if (process.env.NODE_ENV !== "production" && pathname === "/apercu") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function contentSecurityPolicy(nonce: string) {
  const supabase = new URL(env.supabaseUrl);
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' : compiler le lecteur de codes-barres en WebAssembly, et rien d'autre.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    // Les attributs style (React) et les feuilles de next/font demandent 'unsafe-inline' ;
    // le risque reste faible tant que les scripts sont verrouillés par nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase.origin}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase.origin} wss://${supabase.host}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, userId } = await updateSession(request, requestHeaders);
  const { pathname } = request.nextUrl;

  let result: NextResponse;
  if (!userId && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    result = NextResponse.redirect(url);
    // Garder les cookies éventuellement nettoyés par Supabase.
    for (const cookie of response().cookies.getAll()) result.cookies.set(cookie);
  } else if (userId && (pathname === "/connexion" || pathname === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    result = NextResponse.redirect(url);
  } else {
    result = response();
  }

  result.headers.set("Content-Security-Policy", csp);
  return result;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|scan/|sw.js|manifest.webmanifest|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
