import { describe, expect, it } from "vitest";
import { encodePose, getRoomPoses } from "./poses";

const at = (id: string, room: string) => ({
  id,
  room: { name: room },
  x: 1.26,
  y: 2,
  direction: "up",
});

describe("encodePose", () => {
  it("packs id, position to a tenth, velocity and facing", () => {
    expect(
      encodePose({ socketId: "s", x: 10.04, y: 3.06, vx: -2.55, vy: 0, direction: "left" }),
    ).toEqual(["s", 10, 3.1, -2.5, 0, 2]);
  });
});

describe("getRoomPoses", () => {
  it("has every character in the room, stamped with the server time", () => {
    const world = { players: { a: at("a", "r1"), b: at("b", "r2") }, npcs: { n: at("n", "r1") } };
    expect(getRoomPoses(world, "r1", 42)).toEqual({
      t: 42,
      p: [["a", 1.3, 2, 0, 0, 0]],
      n: [["n", 1.3, 2, 0, 0, 0]],
    });
  });
});
