import { describe, expect, it } from "vitest";
import { clampRest, enqueue, formatClock, pendingFor, plausibleTime, restRemaining, retryDelay, settle, type OutboxEntry } from ".";

function entry(partial: Partial<OutboxEntry<{ reps: number }>>): OutboxEntry<{ reps: number }> {
  return { id: "1", key: "set:a", userId: "u1", scope: "w1", payload: { reps: 8 }, queuedAt: "2026-11-08T10:00:00Z", ...partial };
}

describe("file d'attente", () => {
  it("ne garde que la dernière version d'une même série, placée en fin de file", () => {
    let q = enqueue([], entry({ id: "1", key: "set:a" }));
    q = enqueue(q, entry({ id: "2", key: "set:b" }));
    q = enqueue(q, entry({ id: "3", key: "set:a", payload: { reps: 10 } }));
    expect(q.map((e) => e.id)).toEqual(["2", "3"]);
    expect(q[1].payload.reps).toBe(10);
  });

  it("ne fusionne pas les saisies de deux comptes", () => {
    const q = enqueue([entry({ id: "1", userId: "u1" })], entry({ id: "2", userId: "u2" }));
    expect(q).toHaveLength(2);
  });

  it("garde la version plus récente quand l'ancienne vient d'être envoyée", () => {
    let q = enqueue([], entry({ id: "1" }));
    q = enqueue(q, entry({ id: "2", payload: { reps: 12 } }));
    q = settle(q, "1");
    expect(q.map((e) => e.id)).toEqual(["2"]);
    expect(settle(q, "2")).toEqual([]);
  });

  it("filtre par compte et par séance", () => {
    const q = [entry({ id: "1", scope: "w1" }), entry({ id: "2", key: "set:b", scope: "w2" }), entry({ id: "3", key: "set:c", userId: "u2" })];
    expect(pendingFor(q, "u1").map((e) => e.id)).toEqual(["1", "2"]);
    expect(pendingFor(q, "u1", "w2").map((e) => e.id)).toEqual(["2"]);
  });

  it("garde l'heure de validation du téléphone si elle est plausible", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(plausibleTime("2026-11-08T10:30:00+01:00", now)).toBe("2026-11-08T09:30:00.000Z");
    expect(plausibleTime("2026-11-08T12:03:00Z", now)).toBe("2026-11-08T12:03:00.000Z");
    expect(plausibleTime("2026-11-08T13:00:00Z", now)).toBe("2026-11-08T12:00:00.000Z");
    expect(plausibleTime("2026-10-01T12:00:00Z", now)).toBe("2026-11-08T12:00:00.000Z");
    expect(plausibleTime(null, now)).toBe("2026-11-08T12:00:00.000Z");
  });

  it("espace les nouveaux essais jusqu'à une minute", () => {
    expect([1, 2, 3, 4, 10].map(retryDelay)).toEqual([2000, 4000, 8000, 16000, 60000]);
    expect(retryDelay(0)).toBe(2000);
  });
});

describe("chrono de repos", () => {
  it("borne la durée entre 15 s et 10 min", () => {
    expect(clampRest(5)).toBe(15);
    expect(clampRest(90.4)).toBe(90);
    expect(clampRest(900)).toBe(600);
    expect(clampRest(Number.NaN)).toBe(90);
  });

  it("compte les secondes restantes puis le dépassement", () => {
    const end = 100_000;
    expect(restRemaining(end, end - 89_100)).toBe(90);
    expect(restRemaining(end, end - 1)).toBe(1);
    expect(restRemaining(end, end)).toBe(0);
    expect(restRemaining(end, end + 999)).toBe(0);
    expect(restRemaining(end, end + 12_400)).toBe(-12);
  });

  it("affiche minutes et secondes", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-12)).toBe("+0:12");
    expect(formatClock(600)).toBe("10:00");
  });
});
