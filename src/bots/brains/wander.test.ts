import { describe, expect, it } from "vitest";
import { createRng } from "@/rules/world/rng";
import { STAND_STILL, type BotIntent } from "./brain";
import { testView } from "./test-view";
import { wander } from "./wander";

const walk = (seed: number, steps: number) => {
  const rng = createRng(seed);
  let last: BotIntent = STAND_STILL;
  const intents: BotIntent[] = [];
  for (let tick = 0; tick < steps; tick++) {
    last = wander(testView([], last), tick, rng);
    intents.push(last);
  }
  return intents;
};

describe("wander brain", () => {
  it("is the same walk for the same seed", () => {
    expect(walk(7, 500)).toEqual(walk(7, 500));
  });

  it("keeps a heading for a while and changes it now and then", () => {
    const intents = walk(3, 2000);
    const headings = new Set(intents.map((i) => `${i.move.x},${i.move.y}`));
    expect(headings.size).toBeGreaterThan(5);
    expect(headings.size).toBeLessThan(500);
    expect(intents.some((i) => i.move.x || i.move.y)).toBe(true);
  });

  it("walks at unit stick length", () => {
    for (const { move } of walk(5, 500)) {
      const length = Math.hypot(move.x, move.y);
      expect(length === 0 || Math.abs(length - 1) < 1e-9).toBe(true);
    }
  });
});
