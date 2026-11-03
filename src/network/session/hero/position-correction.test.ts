import { describe, expect, it } from "vitest";
import { easeCorrection, planCorrection, SNAP_DISTANCE } from "./position-correction";

describe("position correction", () => {
  it("eases misses up to the snap distance and snaps past it", () => {
    expect(planCorrection({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({
      snap: false,
      offset: { x: 10, y: 0 },
    });
    expect(planCorrection({ x: 0, y: 0 }, { x: SNAP_DISTANCE + 1, y: 0 })).toEqual({ snap: true });
  });

  it("takes part of the way each frame and finishes the last half pixel at once", () => {
    const { step, left } = easeCorrection({ x: 10, y: 0 }, 40);
    expect(step.x).toBeCloseTo(10 * (1 - Math.exp(-1)));
    expect(left!.x).toBeCloseTo(10 - step.x);
    expect(easeCorrection({ x: 0.3, y: 0 }, 16)).toEqual({ step: { x: 0.3, y: 0 } });
  });
});
