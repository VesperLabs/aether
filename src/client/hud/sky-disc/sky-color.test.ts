import { describe, expect, it } from "vitest";
import { isDaytime, skyColorAt } from "./sky-color";

describe("sky color", () => {
  it("is blue by day and dark at night", () => {
    expect(skyColorAt(12)).toBe("#6cb4ec");
    expect(skyColorAt(0)).toBe("#141c3c");
    expect(skyColorAt(24)).toBe("#141c3c");
  });

  it("has the sun up from 6:00 to 19:00", () => {
    expect([isDaytime(5.9), isDaytime(6), isDaytime(18.9), isDaytime(19)]).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});
