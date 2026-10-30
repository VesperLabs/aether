import { describe, expect, it } from "vitest";
import type { CharacterSyncInput } from "./character-state";
import { getBuffRoomState, getRoomState, getTickRoomState } from "./room-state";

function makeCharacter(id: string, room: string, hasBuffChanges = false): CharacterSyncInput {
  return {
    id,
    socketId: id,
    room: { name: room },
    x: 1,
    y: 2,
    vx: 0,
    vy: 0,
    direction: "up",
    stats: {},
    state: { hasBuffChanges },
    equipment: {},
    inventory: [],
    profile: {},
    kind: "player",
    charClass: "mage",
    buffs: [],
    abilities: {},
    activeItemSlots: [],
    gold: 0,
    getQuests: () => [],
  };
}

const world = () => ({
  players: {
    a: makeCharacter("a", "r1", true),
    b: makeCharacter("b", "r2", true),
    c: makeCharacter("c", "r1"),
  },
  npcs: { n1: makeCharacter("n1", "r1", true), n2: makeCharacter("n2", "r2") },
  loots: {
    l1: { id: "l1", roomName: "r1", expiredSince: 5 },
    l2: { id: "l2", roomName: "r2" },
  },
});

describe("getRoomState", () => {
  it("returns the full state of one room and the loot objects themselves", () => {
    const w = world();
    const out = getRoomState(w, "r1");
    expect(out.players.map((p) => p.id)).toEqual(["a", "c"]);
    expect(out.npcs.map((n) => n.id)).toEqual(["n1"]);
    expect(out.loots).toEqual([w.loots.l1]);
    expect(out.loots[0]).toBe(w.loots.l1);
  });

  it("is empty for an unknown room", () => {
    expect(getRoomState(world(), "nope")).toEqual({ players: [], npcs: [], loots: [] });
  });
});

describe("getTickRoomState", () => {
  it("packs the tick shape for one room", () => {
    const out = getTickRoomState(world(), "r1");
    expect(out.players.map((p) => p.id)).toEqual(["a", "c"]);
    expect(out.npcs.map((n) => n.id)).toEqual(["n1"]);
    expect(out.loots).toEqual([{ id: "l1", expiredSince: 5 }]);
    expect(Object.keys(out.players[0] ?? {})).toEqual([
      "id",
      "d",
      "state",
      "x",
      "y",
      "vx",
      "vy",
      "v",
    ]);
  });
});

describe("getBuffRoomState", () => {
  it("only includes characters in the room with buff changes, and clears the flag", () => {
    const w = world();
    const out = getBuffRoomState(w, "r1");
    expect(out.players.map((p) => p.id)).toEqual(["a"]);
    expect(out.npcs.map((n) => n.id)).toEqual(["n1"]);
    expect(w.players.a.state.hasBuffChanges).toBe(false);
    expect(w.players.b.state.hasBuffChanges).toBe(true);
    expect(getBuffRoomState(w, "r1")).toEqual({ players: [], npcs: [] });
  });
});
