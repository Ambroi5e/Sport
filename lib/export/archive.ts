/** Contenu de l'archive d'export : données complètes, CSV, photos et mode d'emploi. */
import { exportCsvFiles } from "./csv";
import type { FonteExport } from "./tables";
import type { ZipEntry } from "./zip";

/** « 2026-11-07 », dans le fuseau de l'appareil. */
export function exportDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Nom lisible d'une photo dans l'archive : date, pose, identifiant (unique). */
export function photoFileName(photo: { id: string; taken_on: string; pose: string }): string {
  const safe = (s: string) => s.replace(/[^\w-]/g, "");
  return `photos/${safe(photo.taken_on)}_${safe(photo.pose)}_${safe(photo.id)}.jpg`;
}

function readme(data: FonteExport, csvFiles: { name: string; label: string }[], photos: number, missing: number): string {
  const lines = [
    "Export Fonte",
    "============",
    "",
    `Compte : ${data.account.email ?? data.account.id}`,
    `Exporté le : ${data.exported_at}`,
    "",
    "donnees.json",
    "  Toutes tes données, telles que Fonte les garde (une liste par table).",
    "  C'est le fichier à garder pour les emmener dans une autre app.",
    "",
    "csv/",
    "  Les mêmes données, une table par fichier, pour un tableur.",
    "  Séparateur point-virgule, virgule décimale, UTF-8 : s'ouvre directement dans",
    "  Excel, Numbers ou LibreOffice réglés en français (Google Sheets : Fichier > Importer).",
    "  Dates au format AAAA-MM-JJ, heures en UTC. Les poids sont en kg, les valeurs",
    "  nutritionnelles des aliments pour 100 g.",
    "",
    ...csvFiles.map((f) => `  ${f.name.padEnd(34)} ${f.label}`),
    "",
  ];
  if (photos > 0 || missing > 0) {
    lines.push("photos/", `  Tes photos de progression (${photos}), nommées date_pose_identifiant.jpg.`);
    if (missing > 0) lines.push(`  ${missing} photo${missing > 1 ? "s n'ont" : " n'a"} pas pu être téléchargée${missing > 1 ? "s" : ""} : refais l'export pour les avoir.`);
    lines.push("");
  }
  lines.push(
    "Ce qui n'y est pas : les codes d'invitation (hachés, et liés à d'autres personnes)",
    "et le catalogue commun d'exercices et d'aliments, sauf les noms de ceux que tu utilises.",
    "",
  );
  return lines.join("\r\n");
}

/**
 * Fichiers de l'archive, rangés dans un dossier `fonte-AAAA-MM-JJ/` pour ne pas
 * se répandre dans le dossier Téléchargements à l'ouverture.
 */
export function archiveEntries(
  data: FonteExport,
  photos: { name: string; data: Uint8Array }[],
  missingPhotos: number,
  day: string,
): ZipEntry[] {
  const root = `fonte-${day}`;
  const csv = exportCsvFiles(data);
  return [
    { name: `${root}/LISEZMOI.txt`, data: readme(data, csv, photos.length, missingPhotos) },
    { name: `${root}/donnees.json`, data: `${JSON.stringify(data, null, 2)}\n` },
    ...csv.map((f) => ({ name: `${root}/csv/${f.name}`, data: f.content })),
    ...photos.map((p) => ({ name: `${root}/${p.name}`, data: p.data })),
  ];
}
