import { describe, expect, it } from "vitest";
import { buildMapPrompt, buildSystemPrompt, cleanStamps, MAP_REPLY_SCHEMA } from "./map-prompt";
import type { Stamp } from "./map-stamps";

describe("buildMapPrompt", () => {
  it("asks for a corner grid one larger than the tile size", () => {
    expect(buildMapPrompt({ instruction: "a lake", width: 10, height: 8 })).toContain(
      "exactly 9 rows of exactly 11 letters",
    );
  });

  it("includes the current grid when revising", () => {
    const prompt = buildMapPrompt({ instruction: "add sand", width: 8, height: 8, grid: ["gw"] });
    expect(prompt).toContain("gw");
    expect(prompt).toContain("Revise it: add sand");
  });
});

describe("MAP_REPLY_SCHEMA", () => {
  it("is a JSON schema Claude Code accepts", () => {
    expect(MAP_REPLY_SCHEMA).toMatchObject({
      type: "object",
      required: ["rows", "stamps", "notes"],
    });
  });
});

const rock: Stamp = {
  id: "rock",
  description: "a boulder",
  width: 1,
  height: 1,
  layers: { Overlay: [5], Collide: [9] },
};

describe("buildSystemPrompt", () => {
  it("lists each stamp with its size and whether it blocks", () => {
    expect(buildSystemPrompt([rock])).toContain("- rock (1x1, blocks): a boulder");
  });
});

describe("cleanStamps", () => {
  const blocked = [false, true, false, false];

  it("keeps stamps on land and drops unknown, off-map and in-water ones", () => {
    const placements = [
      { id: "rock", x: 0, y: 0 },
      { id: "rock", x: 1, y: 0 },
      { id: "rock", x: 2, y: 0 },
      { id: "tree", x: 0, y: 1 },
    ];
    expect(cleanStamps(placements, [rock], blocked, 2)).toEqual([{ id: "rock", x: 0, y: 0 }]);
  });
});
