import { NextResponse } from "next/server";
import { photoLinks } from "../data";

/** Liens signés (10 minutes) vers les photos : le téléphone les télécharge pour l'archive. */
export async function GET() {
  return NextResponse.json({ photos: await photoLinks() }, { headers: { "Cache-Control": "private, no-store" } });
}
