import { describe, expect, it } from "vitest";
import { hairTints, hairTextures, skinTints } from "@/content";
import { stepAppearance } from "./appearance";

const look = {
  gender: "female",
  tint: skinTints[0],
  hair: { texture: "hair-3", tint: hairTints[5] },
  face: { texture: "face-1" },
  whiskers: { texture: "whiskers-3", tint: hairTints[5] },
};

describe("stepAppearance", () => {
  it("steps each option along its own list, wrapping round", () => {
    const next = stepAppearance(look, { hair: { texture: 1 }, face: { texture: -1 }, body: 1 });
    expect(next.hair?.texture).toBe("hair-4");
    expect(next.face?.texture).toBe("face-3");
    expect(next.gender).toBe("male");
    expect(
      stepAppearance({ hair: { texture: hairTextures.at(-1) } }, { hair: { texture: 1 } }),
    ).toMatchObject({ hair: { texture: "hair-0" } });
  });

  it("steps hair colour from the hair colour, not the skin colour", () => {
    expect(stepAppearance(look, { hair: { tint: 1 } }).hair?.tint).toBe(hairTints[6]);
  });

  it("leaves what it isn't asked to change", () => {
    expect(stepAppearance(look, {})).toEqual(look);
  });
});
