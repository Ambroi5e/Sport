/**
 * CSV pour un tableur réglé en français : séparateur `;`, virgule décimale,
 * UTF-8 avec BOM (sans lui, Excel lit mal les accents), lignes en CRLF.
 */
import { EXPORT_TABLES, type FonteExport, type Ref, type Row } from "./tables";

const BOM = "﻿";
const SEPARATOR = ";";

/**
 * Une cellule de texte qui commence par = + - @ (ou une tabulation) serait lue
 * comme une formule par un tableur : on la préfixe d'une apostrophe. Un nom de
 * produit venu d'Open Food Facts ne doit jamais pouvoir exécuter quoi que ce soit.
 */
function neutralize(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function quote(text: string): string {
  return /[;"\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Valeur d'une cellule, déjà échappée. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (Array.isArray(value) && value.every((v) => typeof v === "string" || typeof v === "number")) {
    return quote(neutralize(value.join(", ")));
  }
  if (typeof value === "object") return quote(JSON.stringify(value));
  return quote(neutralize(String(value)));
}

/** Colonnes dans l'ordre de la première ligne, puis celles qui n'apparaissent qu'ensuite. */
function columnsOf(rows: Row[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

export function toCsv(rows: Row[], columns = columnsOf(rows)): string {
  const lines = [columns.map((c) => quote(neutralize(c))).join(SEPARATOR)];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(SEPARATOR));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

type Lookup = Record<Ref["from"], Map<string, Row>>;

function lookups(data: FonteExport): Lookup {
  const index = (rows: Row[] = []) => new Map(rows.map((r) => [String(r.id), r]));
  return {
    exercises: index([...data.catalog.exercises, ...(data.tables.exercises ?? [])]),
    foods: index([...data.catalog.foods, ...(data.tables.foods ?? [])]),
    workouts: index(data.tables.workouts),
  };
}

/**
 * Un fichier par table non vide. `user_id` est retiré (toujours le même) ; chaque
 * identifiant d'exercice, d'aliment ou de séance est suivi de son libellé.
 */
export function exportCsvFiles(data: FonteExport): { name: string; label: string; content: string }[] {
  const lookup = lookups(data);
  const files: { name: string; label: string; content: string }[] = [];
  for (const { table, file, label, refs = [] } of EXPORT_TABLES) {
    const rows = data.tables[table] ?? [];
    if (rows.length === 0) continue;
    const columns = columnsOf(rows).filter((c) => c !== "user_id");
    for (const ref of refs) {
      const at = columns.indexOf(ref.column);
      if (at >= 0) columns.splice(at + 1, 0, ref.as);
    }
    const enriched = rows.map((row) => {
      const out: Row = { ...row };
      for (const ref of refs) {
        const id = row[ref.column];
        out[ref.as] = typeof id === "string" ? (lookup[ref.from].get(id)?.[ref.field] ?? null) : null;
      }
      return out;
    });
    files.push({ name: `${file}.csv`, label, content: toCsv(enriched, columns) });
  }
  return files;
}
