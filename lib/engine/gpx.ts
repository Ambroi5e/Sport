/**
 * Lecture d'un fichier GPX : les points d'une trace, puis ses totaux (distance,
 * temps en mouvement, dénivelé positif, fréquence cardiaque moyenne). Pur et sans
 * dépendance : un GPX est du XML simple, lu par expressions régulières.
 */

export type GpxPoint = { lat: number; lon: number; ele: number | null; time: number | null; hr: number | null };

export type GpxSummary = {
  /** Instant du premier point horodaté (ms depuis 1970), `null` sans horodatage. */
  startedAt: number | null;
  distanceM: number;
  /** Temps en mouvement, `null` sans horodatage. */
  seconds: number | null;
  elevationM: number | null;
  avgHr: number | null;
  /** Sport proposé d'après le type du fichier, `null` s'il n'est pas reconnu. */
  sport: "course" | "trail" | "velo" | "natation" | "rameur" | "marche" | null;
  points: number;
};

/** Au-delà, l'intervalle entre deux points est une pause de l'enregistrement. */
export const GPX_PAUSE_S = 60;
/** Une montée ne compte qu'une fois ce seuil dépassé : le bruit de l'altimètre ne s'additionne pas. */
export const GPX_CLIMB_THRESHOLD_M = 3;
export const GPX_MAX_BYTES = 20 * 1024 * 1024;

const tag = (xml: string, name: string) => new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([^<]*)</(?:\\w+:)?${name}>`, "i").exec(xml)?.[1].trim() ?? null;
const number = (value: string | null | undefined) => (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null);

/** Points de toutes les traces du fichier, dans l'ordre. Un point sans latitude ou longitude valide est ignoré. */
export function parseGpxPoints(xml: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  for (const m of xml.matchAll(/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi)) {
    const lat = number(/\blat\s*=\s*["']([^"']+)["']/i.exec(m[1])?.[1]);
    const lon = number(/\blon\s*=\s*["']([^"']+)["']/i.exec(m[1])?.[1]);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const body = m[2] ?? "";
    const stamp = tag(body, "time");
    const time = stamp ? Date.parse(stamp) : NaN;
    const hr = number(tag(body, "hr"));
    points.push({ lat, lon, ele: number(tag(body, "ele")), time: Number.isFinite(time) ? time : null, hr: hr !== null && hr >= 30 && hr <= 240 ? hr : null });
  }
  return points;
}

const SPORT_WORDS: readonly (readonly [RegExp, NonNullable<GpxSummary["sport"]>])[] = [
  [/trail/, "trail"],
  [/run|course|jog/, "course"],
  [/cycl|bik|ride|velo|vélo/, "velo"],
  [/swim|nat/, "natation"],
  [/row|ram/, "rameur"],
  [/walk|hik|march|rando/, "marche"],
];

/** Sport d'après la balise `<type>` de la trace (« running », « 9 », « Cycling »…). */
export function gpxSport(xml: string): GpxSummary["sport"] {
  const type = /<trk\b[^>]*>[\s\S]*?<type\b[^>]*>([^<]*)<\/type>/i.exec(xml)?.[1].trim().toLowerCase();
  if (!type) return null;
  // Codes numériques de Strava.
  if (type === "9") return "course";
  if (type === "1") return "velo";
  return SPORT_WORDS.find(([words]) => words.test(type))?.[1] ?? null;
}

const EARTH_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distance entre deux points à la surface de la Terre, en mètres. */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Totaux d'une trace ; `null` avec moins de deux points. */
export function summarizeGpx(points: readonly GpxPoint[], sport: GpxSummary["sport"] = null): GpxSummary | null {
  if (points.length < 2) return null;
  let distance = 0;
  let seconds = 0;
  let timed = false;
  let climb = 0;
  let reference: number | null = null;
  let hrSum = 0;
  let hrWeight = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.ele !== null) {
      if (reference === null) reference = p.ele;
      else if (p.ele - reference >= GPX_CLIMB_THRESHOLD_M) {
        climb += p.ele - reference;
        reference = p.ele;
      } else if (p.ele < reference) reference = p.ele;
    }
    if (i === 0) continue;
    const prev = points[i - 1];
    distance += haversine(prev, p);
    if (prev.time === null || p.time === null) continue;
    const dt = (p.time - prev.time) / 1000;
    if (dt <= 0 || dt > GPX_PAUSE_S) continue;
    timed = true;
    seconds += dt;
    if (p.hr !== null) {
      hrSum += p.hr * dt;
      hrWeight += dt;
    }
  }
  return {
    startedAt: points.find((p) => p.time !== null)?.time ?? null,
    distanceM: Math.round(distance),
    seconds: timed ? Math.round(seconds) : null,
    elevationM: reference === null ? null : Math.round(climb),
    avgHr: hrWeight > 0 ? Math.round(hrSum / hrWeight) : null,
    sport,
    points: points.length,
  };
}

/** Un fichier GPX entier vers ses totaux ; `null` si ce n'est pas une trace lisible. */
export function readGpx(xml: string): GpxSummary | null {
  if (!/<gpx\b/i.test(xml)) return null;
  return summarizeGpx(parseGpxPoints(xml), gpxSport(xml));
}
