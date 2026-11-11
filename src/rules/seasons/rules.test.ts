import { describe, expect, it } from "vitest";
import { createCalendar, findSeason, mapSeason, pinSeason, seasonAt } from "./rules";

const on = (month: number, day: number) => Date.UTC(2026, month - 1, day);

describe("seasons", () => {
  it("follow the real northern seasons by month", () => {
    const calendar = createCalendar();
    expect(seasonAt(on(1, 15), calendar)).toBe("winter");
    expect(seasonAt(on(3, 1), calendar)).toBe("spring");
    expect(seasonAt(on(7, 4), calendar)).toBe("summer");
    expect(seasonAt(on(11, 11), calendar)).toBe("fall");
    expect(seasonAt(on(12, 1), calendar)).toBe("winter");
  });

  it("holds a pinned season until it is handed back", () => {
    const calendar = createCalendar();
    pinSeason(calendar, "spring");
    expect(seasonAt(on(11, 11), calendar)).toBe("spring");
    pinSeason(calendar, undefined);
    expect(seasonAt(on(11, 11), calendar)).toBe("fall");
  });

  it("shows the world's season only on maps that cycle", () => {
    expect(mapSeason("cycle", "fall")).toBe("fall");
    expect(mapSeason("winter", "fall")).toBe("winter");
    expect(mapSeason(undefined, "fall")).toBe("summer");
  });

  it("finds a season by the start of its name", () => {
    expect(findSeason("W")).toBe("winter");
    expect(findSeason("")).toBeUndefined();
    expect(findSeason("monsoon")).toBeUndefined();
  });
});
