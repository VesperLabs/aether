import { describe, expect, it } from "vitest";
import { hairTints, skinTints } from "@/content";
import { chooseAppearance } from "./appearance";

const look = {
  gender: "female",
  tint: skinTints[0],
  hair: { texture: "hair-3", tint: hairTints[5] },
  face: { texture: "face-1" },
  whiskers: { texture: "whiskers-3", tint: hairTints[5] },
};

describe("chooseAppearance", () => {
  it("swaps in each chosen part", () => {
    const next = chooseAppearance(look, {
      hair: { texture: "hair-4" },
      face: { texture: "face-3" },
      gender: "male",
      tint: skinTints[2],
    });
    expect(next).toMatchObject({
      hair: { texture: "hair-4", tint: hairTints[5] },
      face: { texture: "face-3" },
      gender: "male",
      tint: skinTints[2],
    });
  });

  it("sets hair colour apart from the hair style", () => {
    expect(chooseAppearance(look, { hair: { tint: hairTints[6] } }).hair).toStrictEqual({
      texture: "hair-3",
      tint: hairTints[6],
    });
  });

  it("adds no unset keys, which would be saved as nulls the database refuses", () => {
    const { tint: _tint, whiskers: _whiskers, ...noTintNoWhiskers } = look;
    expect(chooseAppearance(noTintNoWhiskers, {})).toStrictEqual(noTintNoWhiskers);
  });

  it("gives a part a full texture and tint when choosing one onto a character without it", () => {
    expect(chooseAppearance({}, { whiskers: { tint: hairTints[1] } }).whiskers).toStrictEqual({
      texture: "whiskers-0",
      tint: hairTints[1],
    });
  });

  it("leaves what it isn't asked to change", () => {
    expect(chooseAppearance(look, {})).toEqual(look);
  });
});
