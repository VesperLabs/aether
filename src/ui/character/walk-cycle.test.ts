import { describe, expect, it } from "vitest";
import { getNextDirection, getWalkFrameName, getWalkFrameRect } from "./walk-cycle";

describe("walk cycle", () => {
  it("finds frames on the sheet's grid, sized by its atlas", () => {
    const pose = { direction: "left", step: 2 } as const;
    expect(getWalkFrameRect("./assets/atlas/80x80.json", pose)).toEqual([240, 240, 80, 80]);
    expect(getWalkFrameRect("./assets/atlas/150x150.json", pose)).toEqual([450, 450, 150, 150]);
    expect(getWalkFrameName(pose)).toBe("left-walk.002");
  });

  it("leaves sheets that aren't animated alone", () => {
    const pose = { direction: "down", step: 0 } as const;
    expect(getWalkFrameRect("./assets/atlas/weapon.json", pose)).toBeUndefined();
    expect(getWalkFrameRect("./assets/atlas/32x32-icons.json", pose)).toBeUndefined();
  });

  it("turns counter-clockwise", () => {
    expect(getNextDirection("down")).toBe("right");
    expect(getNextDirection("right")).toBe("up");
    expect(getNextDirection("up")).toBe("left");
    expect(getNextDirection("left")).toBe("down");
  });
});
