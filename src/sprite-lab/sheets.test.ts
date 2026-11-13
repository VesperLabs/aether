import { describe, expect, it } from "vitest";
import {
  ANIMATED_SHEETS,
  BASE_SHEETS,
  dropOtherGender,
  fitsGender,
  getLayerSheets,
  getSheetCell,
  getSheetGender,
  HUMAN_LAYERS,
} from "./sheets";

describe("sprite lab sheets", () => {
  it("includes the human sheet once", () => {
    expect(ANIMATED_SHEETS.filter(({ texture }) => texture === "human")).toHaveLength(1);
  });

  it("lists each image once per gender, however many textures share it", () => {
    const keys = ANIMATED_SHEETS.map(({ src, texture }) => `${src}|${getSheetGender(texture)}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(getLayerSheets("gloves").map(({ texture }) => texture)).toEqual(["human-gloves-cloth"]);
  });

  it("keeps a shared image for each gender, so either body can wear it", () => {
    const robes = getLayerSheets("armor")
      .map(({ texture }) => texture)
      .filter((texture) => texture.endsWith("-armor-robe-wizard"));
    expect(robes.sort()).toEqual([
      "human-female-armor-robe-wizard",
      "human-male-armor-robe-wizard",
    ]);
  });

  it("finds plain and gendered layer sheets", () => {
    const texturesOf = (layer: Parameters<typeof getLayerSheets>[0]) =>
      getLayerSheets(layer).map(({ texture }) => texture);
    expect(texturesOf("hair")).toContain("human-hair-1");
    expect(texturesOf("armor")).toContain("human-male-armor-coat");
    expect(texturesOf("chest")).toContain("human-female-chest-bare");
  });

  it("offers bodies and mobs as bases, and nothing worn over them", () => {
    const bases = BASE_SHEETS.map(({ texture }) => texture);
    expect(bases).toEqual(expect.arrayContaining(["human", "wolf"]));
    expect(bases).not.toContain("shadow");
    expect(bases).not.toContain("human-hair-1");
    expect(getLayerSheets("shadow").map(({ texture }) => texture)).toEqual(["shadow"]);
  });

  it("has sheets for every layer", () => {
    for (const layer of HUMAN_LAYERS) expect(getLayerSheets(layer).length).toBeGreaterThan(0);
  });

  it("keeps sheets for the chest's gender and unisex ones", () => {
    expect(fitsGender("human-hair-1", "male")).toBe(true);
    expect(fitsGender("human-male-armor-coat", "male")).toBe(true);
    expect(fitsGender("human-female-armor-coat", "male")).toBe(false);
    expect(fitsGender("human-female-armor-coat", undefined)).toBe(true);
  });

  it("takes off what doesn't fit a new chest", () => {
    const worn = { armor: "human-female-armor-coat", hair: "human-hair-1" };
    expect(dropOtherGender(worn, "male")).toEqual({ armor: "", hair: "human-hair-1" });
  });

  it("takes a frame's size from the atlas, not a sheet with extra rows", () => {
    expect(getSheetCell("./assets/atlas/gloves/gloves-cloth.png", 400)).toBe(80);
    expect(getSheetCell("./not-a-sheet.png", 200)).toBe(50);
  });
});
