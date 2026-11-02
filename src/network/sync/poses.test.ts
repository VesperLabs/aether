import { describe, expect, it } from "vitest";
import { decodeRoomPoses, encodeRoomPoses } from "./poses";

const at = (nid: number, room: string, x = 1.5) => ({
  nid,
  room: { name: room },
  x,
  y: 2,
  direction: "left",
});

describe("encodeRoomPoses", () => {
  it("packs every character in the room and decodes back to ids", () => {
    const world = {
      players: { a: at(0, "r1"), b: at(1, "r2") },
      npcs: { n: { ...at(2, "r1", 300.25), vx: -40, vy: 12.5 } },
    };
    const ids = ["a", "b", "n"];
    const buffer = encodeRoomPoses(world, "r1", 1_700_000_000_123);
    expect(buffer.byteLength).toBe(12 + 2 * 19);
    expect(decodeRoomPoses(buffer, (nid) => ids[nid])).toEqual({
      t: 1_700_000_000_123,
      p: [["a", 1.5, 2, 0, 0, 2]],
      n: [["n", 300.25, 2, -40, 12.5, 2]],
    });
  });

  it("skips net ids the client does not know yet", () => {
    const buffer = encodeRoomPoses({ players: { a: at(7, "r1") }, npcs: {} }, "r1", 0);
    expect(decodeRoomPoses(new Uint8Array(buffer), () => undefined).p).toEqual([]);
  });
});
