// Copie dans public/scan/ les fichiers que le navigateur charge pour lire un
// code-barres ou une étiquette : Fonte les sert elle-même, sans CDN tiers.
// Lancé avant `next dev` et `next build` ; le dossier n'est pas versionné.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const pkg = (name) => join(process.cwd(), "node_modules", name);
const out = join(process.cwd(), "public", "scan");

const files = [
  // Lecteur de codes-barres (quand le navigateur n'a pas BarcodeDetector).
  [join(pkg("zxing-wasm"), "dist/reader/zxing_reader.wasm"), "zxing_reader.wasm"],
  // Tesseract : script du worker, moteur (une variante par niveau de WebAssembly), français.
  [join(pkg("tesseract.js"), "dist/worker.min.js"), "tesseract/worker.min.js"],
  ...["lstm", "simd-lstm", "relaxedsimd-lstm"].map((v) => [join(pkg("tesseract.js-core"), `tesseract-core-${v}.wasm.js`), `tesseract/core/tesseract-core-${v}.wasm.js`]),
  [join(pkg("@tesseract.js-data/fra"), "4.0.0_best_int/fra.traineddata.gz"), "tesseract/lang/fra.traineddata.gz"],
];

for (const [from, to] of files) {
  const target = join(out, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(from, target);
}
process.stdout.write(`public/scan : ${files.length} fichiers copiés\n`);
