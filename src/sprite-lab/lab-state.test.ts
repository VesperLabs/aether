import { describe, expect, it } from "vitest";
import { parseLabState, serializeLabState } from "./lab-state";

describe("lab state in the URL", () => {
  it("starts empty", () => {
    expect(serializeLabState(parseLabState(""))).toBe("");
  });

  it("round-trips every kind of change", () => {
    const state = parseLabState("");
    state.atlas = "human-blank";
    state.zoom = 4;
    state.target = "hair";
    state.frame = { column: 3, row: 2 };
    state.model = "gemini-3-pro-image";
    state.prompt = "a red scarf & hat";
    state.cores.human = "Draw {request}";
    state.wearableSheet = "human-female-armor-robe-wizard-white";
    state.weapon = "weapon-dagger";
    state.layers.armor = "human-male-armor-coat";
    state.layers.chest = "";
    expect(parseLabState(serializeLabState(state))).toEqual(state);
  });

  it("falls back on values it doesn't know", () => {
    const { atlas, zoom, frame, layers } = parseLabState("?atlas=nope&zoom=9&hair=nope&frame=x");
    expect([atlas, zoom, frame, layers.hair]).toEqual(["human", 2, undefined, "human-hair-1"]);
  });

  it("keeps a hidden atlas in the URL", () => {
    const hidden = { ...parseLabState(""), atlasHidden: true };
    expect(parseLabState(serializeLabState(hidden)).atlasHidden).toBe(true);
    expect(parseLabState("").atlasHidden).toBe(false);
  });
});
