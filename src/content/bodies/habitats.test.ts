import { describe, expect, it } from "vitest";
import { assetList } from "../assets/asset-list";
import { getBody } from "./bodies";
import { BODY_FILES } from "./body-files";
import { currentHabitat, habitatTexture } from "./habitats";

describe("body habitats", () => {
  it("starts in its first habitat, and ignores ones its body lacks", () => {
    expect(currentHabitat("bird", undefined)).toBe("land");
    expect(currentHabitat("bird", "water")).toBe("land");
    expect(currentHabitat("bird", "air")).toBe("air");
    expect(currentHabitat("bat", null)).toBe("air");
  });

  it("shows each later habitat's own sheet", () => {
    expect(habitatTexture("bird", null)).toBe("bird");
    expect(habitatTexture("bird", "air")).toBe("bird-air");
    expect(habitatTexture("wolf", "air")).toBe("wolf");
  });

  it("has a sheet for every habitat of every body", () => {
    for (const race of Object.keys(BODY_FILES)) {
      for (const habitat of getBody(race).habitats.slice(1)) {
        const texture = habitatTexture(race, habitat);
        expect(
          assetList.some((asset) => asset.texture === texture),
          texture,
        ).toBe(true);
      }
    }
  });
});
