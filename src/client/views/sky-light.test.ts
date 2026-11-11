import { describe, expect, it } from "vitest";
import { skyLightAt } from "./sky-light";

describe("skyLightAt", () => {
  it("is bright and rich at noon, dark and drained at midnight", () => {
    const noon = skyLightAt(12);
    const midnight = skyLightAt(0);
    expect(noon.saturation).toBeGreaterThan(0);
    expect(midnight.saturation).toBeLessThan(0);
    expect(midnight.vignette).toBeGreaterThan(noon.vignette);
    expect(skyLightAt(24)).toEqual(midnight);
  });

  it("only dims the day at dusk, without coloring it", () => {
    const { tint } = skyLightAt(18.5);
    const [r, g, b] = [16, 8, 0].map((shift) => (tint >> shift) & 0xff);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeLessThan(0xff);
  });

  it("blends between keyed hours", () => {
    const between = skyLightAt(17.75);
    expect(between.vignette).toBeGreaterThan(skyLightAt(17).vignette);
    expect(between.vignette).toBeLessThan(skyLightAt(18.5).vignette);
  });
});
