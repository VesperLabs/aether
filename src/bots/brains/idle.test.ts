import { describe, expect, it } from "vitest";
import { createRng } from "@/rules/world/rng";
import { idle } from "./idle";
import { testView } from "./test-view";

describe("idle brain", () => {
  it("never moves or attacks", () => {
    const rng = createRng(1);
    for (let tick = 0; tick < 100; tick++) {
      expect(idle(testView(), tick, rng)).toEqual({ move: { x: 0, y: 0 } });
    }
  });
});
