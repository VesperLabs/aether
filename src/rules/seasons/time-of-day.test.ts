import { describe, expect, it } from "vitest";
import { createCalendar } from "./rules";
import { DAY_LENGTH_MS, hourAfter, hourAt, setHour } from "./time-of-day";

describe("time of day", () => {
  it("runs from midnight through the day and round again", () => {
    const calendar = createCalendar();
    expect(hourAt(0, calendar)).toBe(0);
    expect(hourAt(DAY_LENGTH_MS / 2, calendar)).toBe(12);
    expect(hourAt(DAY_LENGTH_MS * 3 + DAY_LENGTH_MS / 4, calendar)).toBe(6);
  });

  it("sets the hour now and carries on from it", () => {
    const calendar = createCalendar();
    const now = 987_654_321;
    setHour(calendar, now, 21);
    expect(hourAt(now, calendar)).toBeCloseTo(21);
    expect(hourAt(now + DAY_LENGTH_MS / 8, calendar)).toBeCloseTo(0);
  });

  it("moves an hour on by elapsed time, past midnight", () => {
    expect(hourAfter(23, DAY_LENGTH_MS / 12)).toBeCloseTo(1);
  });
});
