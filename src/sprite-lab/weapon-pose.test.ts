import { describe, expect, it } from "vitest";
import weaponAtlas from "../../public/assets/atlas/weapon.json";
import { getPoseName, getStartHand } from "./weapon-pose";

describe("weapon poses", () => {
  it("names every animated frame as weapon.json does", () => {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        expect(Object.keys(weaponAtlas.offsets.human)).toContain(getPoseName({ column, row }));
      }
    }
  });

  it("has no pose off the animated part of the sheet", () => {
    expect(getPoseName({ column: 0, row: 4 })).toBeUndefined();
    expect(getPoseName({ column: 6, row: 0 })).toBeUndefined();
  });

  it("starts on the attacking hand", () => {
    expect(getStartHand({ column: 5, row: 1 })).toBe("left");
    expect(getStartHand({ column: 4, row: 1 })).toBe("right");
    expect(getStartHand({ column: 0, row: 1 })).toBe("right");
  });
});
