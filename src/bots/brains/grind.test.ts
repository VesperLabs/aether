import { describe, expect, it } from "vitest";
import { createRng } from "@/rules/world/rng";
import { grind } from "./grind";
import { character, testView } from "./test-view";

const rng = createRng(1);

describe("grind brain", () => {
  it("stands still with no npc around", () => {
    expect(grind(testView(), 0, rng)).toEqual({ move: { x: 0, y: 0 } });
  });

  it("walks toward the nearest living npc", () => {
    const view = testView([
      character("far", 100, 400),
      character("dead", 110, 100, { state: { isDead: true } }),
      character("near", 200, 100),
    ]);
    const intent = grind(view, 0, rng);
    expect(intent.attack).toBeUndefined();
    expect(intent.move.x).toBeCloseTo(1);
    expect(intent.move.y).toBeCloseTo(0);
  });

  it("attacks an npc in reach, aimed at it", () => {
    const intent = grind(testView([character("rat", 100, 120)]), 0, rng);
    expect(intent.move).toEqual({ x: 0, y: 0 });
    expect(intent.attack?.angle).toBeCloseTo(Math.PI / 2);
  });

  it("ignores npcs in other rooms", () => {
    const intent = grind(testView([character("rat", 100, 120, { roomName: "mine" })]), 0, rng);
    expect(intent).toEqual({ move: { x: 0, y: 0 } });
  });
});
