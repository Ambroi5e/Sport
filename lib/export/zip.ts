/**
 * Archive zip sans compression (méthode « stored ») : les photos sont déjà des
 * JPEG, le reste pèse peu. Pas de zip64 : moins de 4 Go et de 65 535 fichiers.
 * Fonctionne dans le navigateur comme dans Node.
 */

let table: Uint32Array | null = null;

/** CRC-32 (polynôme 0xEDB88320), celui qu'exige le format zip. */
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Uint8Array | string };

/** Heure et date au format MS-DOS, en heure locale (celle qu'affichent les explorateurs). */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const UTF8_FLAG = 0x0800;
const VERSION = 20;

export function createZip(entries: ZipEntry[], modified = new Date()): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(modified);
  const files = entries.map((e) => {
    const name = encoder.encode(e.name);
    const data = typeof e.data === "string" ? encoder.encode(e.data) : e.data;
    return { name, data, crc: crc32(data) };
  });
  if (files.length > 0xffff) throw new Error("Trop de fichiers pour une archive zip simple.");

  const localSize = files.reduce((sum, f) => sum + 30 + f.name.length + f.data.length, 0);
  const centralSize = files.reduce((sum, f) => sum + 46 + f.name.length, 0);
  const total = localSize + centralSize + 22;
  if (total > 0xffffffff) throw new Error("Archive trop lourde pour un zip simple.");

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];

  for (const f of files) {
    offsets.push(at);
    view.setUint32(at, 0x04034b50, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, UTF8_FLAG, true);
    view.setUint16(at + 8, 0, true); // stocké, sans compression
    view.setUint16(at + 10, time, true);
    view.setUint16(at + 12, date, true);
    view.setUint32(at + 14, f.crc, true);
    view.setUint32(at + 18, f.data.length, true);
    view.setUint32(at + 22, f.data.length, true);
    view.setUint16(at + 26, f.name.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(f.name, at + 30);
    out.set(f.data, at + 30 + f.name.length);
    at += 30 + f.name.length + f.data.length;
  }

  const centralStart = at;
  files.forEach((f, i) => {
    view.setUint32(at, 0x02014b50, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, VERSION, true);
    view.setUint16(at + 8, UTF8_FLAG, true);
    view.setUint16(at + 10, 0, true);
    view.setUint16(at + 12, time, true);
    view.setUint16(at + 14, date, true);
    view.setUint32(at + 16, f.crc, true);
    view.setUint32(at + 20, f.data.length, true);
    view.setUint32(at + 24, f.data.length, true);
    view.setUint16(at + 28, f.name.length, true);
    // Champ supplémentaire, commentaire, disque, attributs : vides.
    view.setUint32(at + 42, offsets[i], true);
    out.set(f.name, at + 46);
    at += 46 + f.name.length;
  });

  view.setUint32(at, 0x06054b50, true);
  view.setUint16(at + 8, files.length, true);
  view.setUint16(at + 10, files.length, true);
  view.setUint32(at + 12, at - centralStart, true);
  view.setUint32(at + 16, centralStart, true);
  return out;
}
