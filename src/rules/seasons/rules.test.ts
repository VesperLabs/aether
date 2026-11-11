import { describe, expect, it } from "vitest";
import {
  SEASON_LENGTH_MS,
  createCalendar,
  findSeason,
  mapSeason,
  seasonAt,
  startSeason,
} from "./rules";

describe("seasons", () => {
  it("runs spring, summer, fall, winter, then spring again", () => {
    const calendar = createCalendar();
    const at = (seasons: number) => seasonAt(seasons * SEASON_LENGTH_MS, calendar);
    expect([at(0), at(1.5), at(2), at(3.99), at(4)]).toEqual([
      "spring",
      "summer",
      "fall",
      "winter",
      "spring",
    ]);
  });

  it("starts a chosen season now and carries on from it", () => {
    const calendar = createCalendar();
    const now = 123_456_789_000;
    startSeason(calendar, now, "winter");
    expect(seasonAt(now, calendar)).toBe("winter");
    expect(seasonAt(now + SEASON_LENGTH_MS - 1, calendar)).toBe("winter");
    expect(seasonAt(now + SEASON_LENGTH_MS, calendar)).toBe("spring");
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
