import { describe, expect, it } from "vitest";
import { gpxSport, haversine, parseGpxPoints, readGpx, summarizeGpx, type GpxPoint } from "./gpx";

const pt = (lat: number, lon: number, time: string | null, ele: number | null = null, hr: number | null = null) =>
  `<trkpt lat="${lat}" lon="${lon}">${ele === null ? "" : `<ele>${ele}</ele>`}${time ? `<time>${time}</time>` : ""}${
    hr === null ? "" : `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`
  }</trkpt>`;

const gpx = (points: string, type = "running") => `<?xml version="1.0"?><gpx version="1.1"><trk><name>Sortie</name><type>${type}</type><trkseg>${points}</trkseg></trk></gpx>`;

describe("parseGpxPoints", () => {
  it("lit position, altitude, heure et fréquence cardiaque", () => {
    const points = parseGpxPoints(gpx(pt(48.85, 2.35, "2026-11-01T08:00:00Z", 35.5, 142)));
    expect(points).toEqual([{ lat: 48.85, lon: 2.35, ele: 35.5, time: Date.parse("2026-11-01T08:00:00Z"), hr: 142 }]);
  });

  it("accepte un point sans contenu et ignore un point sans position valide", () => {
    const xml = gpx(`<trkpt lat="48.85" lon="2.35"/><trkpt lat="abc" lon="2.35"></trkpt><trkpt lon='2.36' lat='48.86'></trkpt><trkpt lat="95" lon="2"></trkpt>`);
    expect(parseGpxPoints(xml).map((p) => [p.lat, p.lon])).toEqual([
      [48.85, 2.35],
      [48.86, 2.36],
    ]);
  });

  it("écarte une fréquence cardiaque impossible", () => {
    expect(parseGpxPoints(gpx(pt(48.85, 2.35, null, null, 400)))[0].hr).toBeNull();
  });
});

describe("gpxSport", () => {
  it.each([
    ["running", "course"],
    ["Trail Running", "trail"],
    ["cycling", "velo"],
    ["9", "course"],
    ["1", "velo"],
    ["hiking", "marche"],
    ["swimming", "natation"],
    ["rowing", "rameur"],
  ])("reconnaît %s", (type, sport) => {
    expect(gpxSport(gpx("", type))).toBe(sport);
  });

  it("ne devine pas un type inconnu ou absent", () => {
    expect(gpxSport(gpx("", "yoga"))).toBeNull();
    expect(gpxSport("<gpx><trk><trkseg></trkseg></trk></gpx>")).toBeNull();
  });
});

describe("haversine", () => {
  it("mesure un degré de latitude à environ 111,2 km", () => {
    expect(haversine({ lat: 48, lon: 2 }, { lat: 49, lon: 2 })).toBeCloseTo(111_195, -1);
  });
});

describe("summarizeGpx", () => {
  // 0,001° de latitude = 111,2 m. Un point toutes les 30 s.
  const line = (n: number, extra: (i: number) => Partial<GpxPoint> = () => ({})): GpxPoint[] =>
    Array.from({ length: n }, (_, i) => ({ lat: 48 + i * 0.001, lon: 2, ele: null, time: Date.parse("2026-11-01T08:00:00Z") + i * 30_000, hr: null, ...extra(i) }));

  it("additionne distance et temps", () => {
    const s = summarizeGpx(line(11), "course")!;
    expect(s.distanceM).toBe(1112);
    expect(s.seconds).toBe(300);
    expect(s.startedAt).toBe(Date.parse("2026-11-01T08:00:00Z"));
    expect(s.sport).toBe("course");
    expect(s.elevationM).toBeNull();
    expect(s.avgHr).toBeNull();
  });

  it("retire les pauses de plus d'une minute du temps, pas de la distance", () => {
    const points = line(11).map((p, i) => (i >= 5 ? { ...p, time: p.time! + 600_000 } : p));
    const s = summarizeGpx(points)!;
    expect(s.seconds).toBe(270);
    expect(s.distanceM).toBe(1112);
  });

  it("cumule les montées au-delà du seuil et ignore le bruit", () => {
    const eles = [100, 101, 100, 102, 104, 110, 108, 109, 107, 111, 111];
    const s = summarizeGpx(line(11, (i) => ({ ele: eles[i] })))!;
    // 100 → 104 (+4), 104 → 110 (+6), creux à 107 puis 111 (+4) ; les ±1 ou 2 m ne comptent pas.
    expect(s.elevationM).toBe(14);
  });

  it("moyenne la fréquence cardiaque sur le temps où elle est connue", () => {
    const s = summarizeGpx(line(5, (i) => ({ hr: i < 3 ? 140 : 160 })))!;
    expect(s.avgHr).toBe(150);
  });

  it("laisse la durée vide sans horodatage, et refuse moins de deux points", () => {
    expect(summarizeGpx(line(3, () => ({ time: null })))!.seconds).toBeNull();
    expect(summarizeGpx(line(1))).toBeNull();
  });
});

describe("readGpx", () => {
  it("résume un fichier entier", () => {
    const xml = gpx([0, 1, 2, 3].map((i) => pt(48 + i * 0.001, 2, `2026-11-01T08:00:${String(i * 15).padStart(2, "0")}Z`, 50 + i * 2, 150)).join(""), "cycling");
    expect(readGpx(xml)).toEqual({ startedAt: Date.parse("2026-11-01T08:00:00Z"), distanceM: 334, seconds: 45, elevationM: 4, avgHr: 150, sport: "velo", points: 4 });
  });

  it("refuse ce qui n'est pas un GPX ou n'a pas de trace", () => {
    expect(readGpx("<html></html>")).toBeNull();
    expect(readGpx('<gpx><wpt lat="1" lon="1"/></gpx>')).toBeNull();
  });
});
