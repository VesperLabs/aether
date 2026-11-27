import { describe, expect, it } from "vitest";
import { isActive } from "./active";

describe("isActive", () => {
  it("is always active without times", () => {
    expect(isActive(undefined, { season: "winter", hour: 3 })).toBe(true);
    expect(isActive({}, { season: "winter", hour: 3 })).toBe(true);
  });

  it("keeps to its seasons", () => {
    const active = { seasons: ["spring", "summer"] as const };
    expect(isActive(active, { season: "spring", hour: 12 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 12 })).toBe(true);
    expect(isActive(active, { season: "fall", hour: 12 })).toBe(false);
    expect(isActive(active, { season: "winter", hour: 12 })).toBe(false);
  });

  it("keeps to its hours, from inclusive to exclusive", () => {
    const active = { hours: [6, 20] as const };
    expect(isActive(active, { season: "summer", hour: 6 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 19.9 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 20 })).toBe(false);
    expect(isActive(active, { season: "summer", hour: 5.9 })).toBe(false);
  });

  it("wraps hours past midnight", () => {
    const active = { hours: [20, 6] as const };
    expect(isActive(active, { season: "summer", hour: 23 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 2 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 12 })).toBe(false);
  });

  it("needs both the season and the hour", () => {
    const active = { seasons: ["summer"] as const, hours: [6, 20] as const };
    expect(isActive(active, { season: "summer", hour: 22 })).toBe(false);
    expect(isActive(active, { season: "winter", hour: 12 })).toBe(false);
  });

  it("shelters a fair-weather actor while anything falls", () => {
    const active = { fairWeather: true };
    expect(isActive(active, { season: "summer", hour: 12 })).toBe(true);
    expect(isActive(active, { season: "summer", hour: 12, isFalling: true })).toBe(false);
    expect(isActive({}, { season: "summer", hour: 12, isFalling: true })).toBe(true);
  });
});
