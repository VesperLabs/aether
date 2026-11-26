import { describe, expect, it } from "vitest";
import { cloudsOver } from "./clouds";
import { driftAt, WIND_SPELL_MS } from "./wind";

const NOW = Date.UTC(2026, 10, 26, 12);
const AREA = { left: 0, top: 0, right: 3000, bottom: 3000 };

describe("cloudsOver", () => {
  it("puts the same clouds in the same places for everyone", () => {
    expect(cloudsOver("meadow", NOW, AREA)).toEqual(cloudsOver("meadow", NOW, AREA));
  });

  it("gives each map its own clouds", () => {
    expect(cloudsOver("meadow", NOW, AREA)).not.toEqual(cloudsOver("town", NOW, AREA));
  });

  it("drifts them a little with time, not jumping", () => {
    const before = cloudsOver("meadow", NOW, AREA)[0];
    const after = cloudsOver("meadow", NOW + 1000, AREA).find((c) => c.shape === before.shape);
    expect(after).toBeDefined();
    expect(Math.hypot(after!.x - before.x, after!.y - before.y)).toBeLessThan(20);
  });

  it("has some clouds over a big area", () => {
    expect(cloudsOver("meadow", NOW, AREA).length).toBeGreaterThan(3);
  });
});

describe("driftAt", () => {
  it("never jumps when the wind turns", () => {
    const turn = Math.ceil(NOW / WIND_SPELL_MS) * WIND_SPELL_MS;
    const a = driftAt(turn - 1);
    const b = driftAt(turn + 1);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(1);
  });
});
