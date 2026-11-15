import { describe, expect, it } from "vitest";
import { aimNpcSwing, leadNpcChase } from "./aim";

describe("aimNpcSwing", () => {
  it("swings a beat ahead of a moving target", () => {
    expect(aimNpcSwing({ x: 0, y: 0, vx: 100, vy: 0 }).x).toBeGreaterThan(0);
    expect(aimNpcSwing({ x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });
});

describe("leadNpcChase", () => {
  it("heads part way to where a circling target is going", () => {
    const to = leadNpcChase({ x: 0, y: 0 }, { x: 100, y: 0, vx: 0, vy: 100 }, 100);
    expect(to.x).toBe(100);
    expect(to.y).toBeGreaterThan(0);
    expect(to.y).toBeLessThan(100);
  });

  it("goes straight for a target standing still", () => {
    expect(leadNpcChase({ x: 0, y: 0 }, { x: 100, y: 0 }, 100)).toEqual({ x: 100, y: 0 });
  });
});
