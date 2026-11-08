import { describe, expect, it } from "vitest";
import { archiveEntries, photoFileName } from "./archive";
import { csvCell, exportCsvFiles, toCsv } from "./csv";
import { catalogIds, type FonteExport } from "./tables";
import { crc32, createZip } from "./zip";

const EX_CATALOG = "aaaaaaaa-0000-4000-8000-000000000001";
const EX_OWN = "aaaaaaaa-0000-4000-8000-000000000002";
const FOOD_CATALOG = "bbbbbbbb-0000-4000-8000-000000000001";
const WORKOUT = "cccccccc-0000-4000-8000-000000000001";

function sample(): FonteExport {
  return {
    format: "fonte-export",
    version: 1,
    exported_at: "2026-11-07T10:00:00.000Z",
    account: { id: "u1", email: "alice@example.test", created_at: "2026-11-01T08:00:00Z", providers: ["email"] },
    tables: {
      exercises: [{ id: EX_OWN, user_id: "u1", name: "Curl marteau poulie" }],
      workouts: [{ id: WORKOUT, user_id: "u1", performed_on: "2026-11-05", name: "Haut du corps" }],
      workout_sets: [
        { id: "s1", user_id: "u1", workout_id: WORKOUT, exercise_id: EX_CATALOG, set_number: 1, reps: 8, weight_kg: 82.5, is_warmup: false },
        { id: "s2", user_id: "u1", workout_id: WORKOUT, exercise_id: EX_OWN, set_number: 1, reps: 12, weight_kg: 15, is_warmup: false },
      ],
      food_logs: [{ id: "f1", user_id: "u1", food_id: FOOD_CATALOG, grams: 150, eaten_on: "2026-11-05", meal: "dejeuner" }],
      body_weights: [],
    },
    catalog: { exercises: [{ id: EX_CATALOG, name: "Développé couché" }], foods: [{ id: FOOD_CATALOG, name: "Riz basmati cuit", brand: null }] },
  };
}

describe("cellules CSV", () => {
  it("écrit les nombres à la française et les booléens en mots", () => {
    expect(csvCell(82.5)).toBe("82,5");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(true)).toBe("oui");
    expect(csvCell(null)).toBe("");
    expect(csvCell(["pectoraux", "triceps"])).toBe("pectoraux, triceps");
  });

  it("met entre guillemets ce qui casserait une ligne", () => {
    expect(csvCell('Yaourt "nature"; 0 %')).toBe('"Yaourt ""nature""; 0 %"');
    expect(csvCell("deux\nlignes")).toBe('"deux\nlignes"');
    expect(csvCell({ semaines: 8 })).toBe('"{""semaines"":8}"');
  });

  it("empêche un texte de devenir une formule dans le tableur", () => {
    expect(csvCell("=HYPERLINK(\"http://exemple.test\")")).toBe("\"'=HYPERLINK(\"\"http://exemple.test\"\")\"");
    expect(csvCell("+33 6")).toBe("'+33 6");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell(-2.5)).toBe("-2,5");
  });

  it("commence par un BOM et sépare par des points-virgules", () => {
    const csv = toCsv([{ a: 1.5, b: "x" }, { a: 2, c: true }]);
    expect(csv).toBe("﻿a;b;c\r\n1,5;x;\r\n2;;oui\r\n");
  });
});

describe("fichiers CSV de l'export", () => {
  it("nomme exercices, aliments et séances à côté de leur identifiant, sans user_id", () => {
    const files = exportCsvFiles(sample());
    const series = files.find((f) => f.name === "series.csv")!;
    const [header, first, second] = series.content.replace("﻿", "").split("\r\n");
    expect(header).toBe("id;workout_id;workout_date;exercise_id;exercise_name;set_number;reps;weight_kg;is_warmup");
    expect(first).toContain(`${EX_CATALOG};Développé couché;1;8;82,5;non`);
    expect(second).toContain(`${EX_OWN};Curl marteau poulie;`);
    expect(first).toContain(`${WORKOUT};2026-11-05;`);
    const journal = files.find((f) => f.name === "journal-alimentaire.csv")!;
    expect(journal.content).toContain(`${FOOD_CATALOG};Riz basmati cuit;150`);
  });

  it("ne crée pas de fichier pour une table vide", () => {
    expect(exportCsvFiles(sample()).map((f) => f.name)).not.toContain("pesees.csv");
  });

  it("liste les identifiants du catalogue à nommer, pas ceux de la personne", () => {
    const { tables } = sample();
    expect(catalogIds(tables, "exercises")).toEqual([EX_CATALOG]);
    expect(catalogIds(tables, "foods")).toEqual([FOOD_CATALOG]);
  });
});

describe("archive zip", () => {
  it("calcule le CRC-32 de référence", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("écrit des en-têtes que l'annuaire central retrouve", () => {
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const zip = createZip([{ name: "fonte/LISEZMOI.txt", data: "Bonjour é" }, { name: "fonte/photos/a.jpg", data: photo }], new Date(2026, 10, 7, 10, 30));
    const view = new DataView(zip.buffer);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    let at = view.getUint32(end + 16, true);
    const names: string[] = [];
    for (let i = 0; i < 2; i++) {
      expect(view.getUint32(at, true)).toBe(0x02014b50);
      const nameLength = view.getUint16(at + 28, true);
      const local = view.getUint32(at + 42, true);
      expect(view.getUint32(local, true)).toBe(0x04034b50);
      const size = view.getUint32(local + 18, true);
      const data = zip.slice(local + 30 + nameLength, local + 30 + nameLength + size);
      expect(crc32(data)).toBe(view.getUint32(at + 16, true));
      names.push(new TextDecoder().decode(zip.slice(at + 46, at + 46 + nameLength)));
      at += 46 + nameLength;
    }
    expect(names).toEqual(["fonte/LISEZMOI.txt", "fonte/photos/a.jpg"]);
  });

  it("range tout dans un dossier daté, photos comprises", () => {
    const name = photoFileName({ id: "11111111-1111-4111-8111-111111111111", taken_on: "2026-11-01", pose: "face" });
    expect(name).toBe("photos/2026-11-01_face_11111111-1111-4111-8111-111111111111.jpg");
    const entries = archiveEntries(sample(), [{ name, data: new Uint8Array([1]) }], 1, "2026-11-07");
    expect(entries.map((e) => e.name)).toEqual([
      "fonte-2026-11-07/LISEZMOI.txt",
      "fonte-2026-11-07/donnees.json",
      "fonte-2026-11-07/csv/exercices-perso.csv",
      "fonte-2026-11-07/csv/seances.csv",
      "fonte-2026-11-07/csv/series.csv",
      "fonte-2026-11-07/csv/journal-alimentaire.csv",
      `fonte-2026-11-07/${name}`,
    ]);
    expect(entries[0].data).toContain("1 photo n'a pas pu être téléchargée");
  });
});
