import { describe, expect, it } from "vitest";
import { groupBoard, groupFeed, isGroupLive, type GroupEvent, type GroupPerson } from "./group";

const people: GroupPerson[] = [
  { userId: "a", name: "Alice", joinedAt: "2026-11-07T09:00:00Z", isOwner: true },
  { userId: "b", name: "Bruno", joinedAt: "2026-11-07T09:02:00Z", isOwner: false },
  { userId: "c", name: "Chloé", joinedAt: null, isOwner: false },
];

const event = (id: string, userId: string, exercise: string, minute: number, weightKg: number | null = 80, reps: number | null = 5): GroupEvent => ({
  id,
  userId,
  exercise,
  weightKg,
  reps,
  durationSeconds: null,
  at: `2026-11-07T09:${String(minute).padStart(2, "0")}:00Z`,
});

describe("groupBoard", () => {
  const events = [event("3", "a", "Squat", 12), event("1", "a", "Squat", 5), event("2", "b", "Tractions", 6, null, 8), event("4", "a", "Presse", 20, 120, 10), event("5", "z", "Squat", 21)];
  const board = groupBoard(people, events);

  it("garde l'ordre des participants et compte leurs séries", () => {
    expect(board.map((r) => [r.name, r.sets])).toEqual([
      ["Alice", 3],
      ["Bruno", 1],
      ["Chloé", 0],
    ]);
  });

  it("donne la dernière série et son numéro dans l'exercice", () => {
    expect(board[0].last?.exercise).toBe("Presse");
    expect(board[0].lastSetNumber).toBe(1);
    expect(groupBoard(people, events.slice(0, 2))[0]).toMatchObject({ lastSetNumber: 2, exercises: ["Squat"] });
    expect(board[2]).toMatchObject({ last: null, lastSetNumber: 0, volumeKg: 0 });
  });

  it("additionne le volume, sans compter une série au poids du corps", () => {
    expect(board[0].volumeKg).toBe(80 * 5 * 2 + 120 * 10);
    expect(board[1].volumeKg).toBe(0);
    expect(board[0].exercises).toEqual(["Squat", "Presse"]);
  });

  it("ignore les séries de quelqu'un qui a quitté la séance", () => {
    expect(board.reduce((n, r) => n + r.sets, 0)).toBe(4);
  });
});

describe("groupFeed", () => {
  it("met la série la plus récente en premier et coupe à la limite", () => {
    const events = [event("1", "a", "Squat", 5), event("2", "b", "Tractions", 6), event("3", "a", "Squat", 12)];
    expect(groupFeed(events, 2).map((e) => e.id)).toEqual(["3", "2"]);
  });
});

describe("isGroupLive", () => {
  const start = Date.parse("2026-11-07T09:00:00Z");
  it("est ouverte jusqu'à six heures après son lancement, sauf si elle est terminée", () => {
    expect(isGroupLive({ createdAt: "2026-11-07T09:00:00Z", endedAt: null }, start + 5 * 3_600_000)).toBe(true);
    expect(isGroupLive({ createdAt: "2026-11-07T09:00:00Z", endedAt: null }, start + 6 * 3_600_000)).toBe(false);
    expect(isGroupLive({ createdAt: "2026-11-07T09:00:00Z", endedAt: "2026-11-07T10:00:00Z" }, start + 3_600_000)).toBe(false);
  });
});
