import { describe, expect, it } from "vitest";
import { isReminderKind, reminderNotifications, REMINDER_KINDS, REMINDERS, toTime } from "./reminders";

describe("rappels", () => {
  it("lit une heure de la base ou du champ, refuse le reste", () => {
    expect(toTime("07:30:00")).toBe("07:30");
    expect(toTime("18:05")).toBe("18:05");
    expect(toTime("00:00")).toBe("00:00");
    for (const bad of ["24:00", "7:30", "18:60", "", "18h00", null, 1800]) expect(toTime(bad)).toBeNull();
  });

  it("reconnaît les quatre rappels", () => {
    expect(REMINDER_KINDS.every(isReminderKind)).toBe(true);
    expect(isReminderKind("pesee")).toBe(false);
  });

  it("une notification par rappel connu, dans l'ordre des rappels, vers une page de l'app", () => {
    const list = reminderNotifications(["bilan", "inconnu", "forme"]);
    expect(list.map((n) => n.tag)).toEqual(["rappel-forme", "rappel-bilan"]);
    expect(list[0]).toMatchObject({ title: REMINDERS.forme.title, url: "/" });
    expect(list.every((n) => n.url.startsWith("/"))).toBe(true);
    expect(reminderNotifications([])).toEqual([]);
  });
});
