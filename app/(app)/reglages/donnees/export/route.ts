import { NextResponse } from "next/server";
import { collectExport } from "../data";

/** Toutes les données de la personne connectée, en un fichier JSON à télécharger. */
export async function GET() {
  const data = await collectExport();
  const day = data.exported_at.slice(0, 10);
  return new NextResponse(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fonte-${day}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
