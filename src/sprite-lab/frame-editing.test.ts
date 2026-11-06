import { describe, expect, it } from "vitest";
import {
  getLinePixels,
  getNudgeOffset,
  getRectBetween,
  isInRect,
  toHexColor,
} from "./frame-editing";

describe("frame editing", () => {
  it("joins two points without gaps", () => {
    expect(getLinePixels(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(getLinePixels(2, 2, 2, 2)).toEqual([{ x: 2, y: 2 }]);
  });

  it("boxes a drag in any direction, both corners included", () => {
    const rect = getRectBetween(5, 6, 3, 4);
    expect(rect).toEqual({ x: 3, y: 4, width: 3, height: 3 });
    expect(isInRect(rect, 5, 6)).toBe(true);
    expect(isInRect(rect, 6, 6)).toBe(false);
  });

  it("nudges one pixel on an arrow, ten with Shift, and ignores other keys", () => {
    expect(getNudgeOffset("ArrowLeft", false)).toEqual({ x: -1, y: 0 });
    expect(getNudgeOffset("ArrowDown", true)).toEqual({ x: 0, y: 10 });
    expect(getNudgeOffset("a", false)).toBeUndefined();
  });

  it("writes colours as hex", () => {
    expect(toHexColor(255, 0, 10)).toBe("#ff000a");
  });
});
