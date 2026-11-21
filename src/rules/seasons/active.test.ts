import { describe, expect, it } from "vitest";
import { isActive } from "./active";

describe("isActive", () => {
  it("is always active without times", () => {
    expect(isActive(undefined, "winter", 3)).toBe(true);
    expect(isActive({}, "winter", 3)).toBe(true);
  });

  it("keeps to its seasons", () => {
    const active = { seasons: ["spring", "summer"] as const };
    expect(isActive(active, "spring", 12)).toBe(true);
    expect(isActive(active, "summer", 12)).toBe(true);
    expect(isActive(active, "fall", 12)).toBe(false);
    expect(isActive(active, "winter", 12)).toBe(false);
  });

  it("keeps to its hours, from inclusive to exclusive", () => {
    const active = { hours: [6, 20] as const };
    expect(isActive(active, "summer", 6)).toBe(true);
    expect(isActive(active, "summer", 19.9)).toBe(true);
    expect(isActive(active, "summer", 20)).toBe(false);
    expect(isActive(active, "summer", 5.9)).toBe(false);
  });

  it("wraps hours past midnight", () => {
    const active = { hours: [20, 6] as const };
    expect(isActive(active, "summer", 23)).toBe(true);
    expect(isActive(active, "summer", 2)).toBe(true);
    expect(isActive(active, "summer", 12)).toBe(false);
  });

  it("needs both the season and the hour", () => {
    const active = { seasons: ["summer"] as const, hours: [6, 20] as const };
    expect(isActive(active, "summer", 22)).toBe(false);
    expect(isActive(active, "winter", 12)).toBe(false);
  });
});
