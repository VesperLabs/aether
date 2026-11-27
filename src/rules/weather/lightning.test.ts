import { describe, expect, it } from "vitest";
import { lightningAt } from "./lightning";

const START = Date.UTC(2026, 10, 1);
const HOUR = 60 * 60 * 1000;

/** The moments a flash begins over `ms` from `from`, sampled every 10 ms. */
function strikes(from: number, ms: number) {
  const found: number[] = [];
  let last = 0;
  for (let t = from; t < from + ms; t += 10) {
    const now = lightningAt(t);
    if (now === 1 && last < 1) found.push(t);
    last = now;
  }
  return found;
}

describe("lightningAt", () => {
  it("gives the same flash for the same moment", () => {
    for (let t = START; t < START + 60_000; t += 333) {
      expect(lightningAt(t)).toBe(lightningAt(t));
    }
  });

  it("strikes now and then: about every 16 seconds over an hour", () => {
    const count = strikes(START, HOUR).length;
    expect(count).toBeGreaterThan(150);
    expect(count).toBeLessThan(320);
  });

  it("stays between dark and full", () => {
    for (let t = START; t < START + 120_000; t += 7) {
      const brightness = lightningAt(t);
      expect(brightness).toBeGreaterThanOrEqual(0);
      expect(brightness).toBeLessThanOrEqual(1);
    }
  });
});
