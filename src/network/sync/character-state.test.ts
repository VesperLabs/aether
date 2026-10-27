import { describe, expect, it } from "vitest";
import {
  getBuffCharacterState,
  getFullCharacterState,
  getLootTickWire,
  getTickCharacterState,
  getTickStateLite,
  type CharacterSyncInput,
} from "./character-state";

function makeCharacter(over: Partial<CharacterSyncInput> = {}): CharacterSyncInput {
  return {
    id: "npc-1",
    socketId: "sock-1",
    peerId: "peer-1",
    room: { name: "grassland-1" },
    x: 10.5,
    y: 20.25,
    vx: 0.5,
    vy: -1,
    direction: "left",
    stats: { hp: 5 },
    state: { isAiming: true, hasBuffChanges: true, secret: 1 },
    equipment: { weapon: 1 },
    inventory: [1],
    profile: { name: "a" },
    kind: "player",
    charClass: "mage",
    npcKills: { rat: 2 },
    buffs: [{ name: "x" }],
    abilities: { 0: 1 },
    activeItemSlots: ["a"],
    gold: 7,
    hitBoxSize: { w: 1 },
    getQuests: () => [{ id: "q" }],
    ...over,
  };
}

describe("getFullCharacterState", () => {
  it("packs the wire keys in a stable order", () => {
    expect(Object.keys(getFullCharacterState(makeCharacter()))).toEqual([
      "id",
      "socketId",
      "peerId",
      "roomName",
      "x",
      "y",
      "vx",
      "vy",
      "direction",
      "stats",
      "state",
      "equipment",
      "inventory",
      "profile",
      "kind",
      "charClass",
      "npcKills",
      "buffs",
      "quests",
      "abilities",
      "activeItemSlots",
      "gold",
      "hitBoxSize",
    ]);
  });

  it("uses socketId as id for players and id for npcs", () => {
    const player = getFullCharacterState(makeCharacter());
    expect(player.id).toBe("sock-1");
    expect(player.socketId).toBe("sock-1");
    const npc = getFullCharacterState(makeCharacter({ socketId: undefined }));
    expect(npc.id).toBe("npc-1");
    expect(npc.socketId).toBe("npc-1");
  });

  it("reads the room name and quests", () => {
    const out = getFullCharacterState(makeCharacter());
    expect(out.roomName).toBe("grassland-1");
    expect(out.quests).toEqual([{ id: "q" }]);
  });
});

describe("getTickCharacterState", () => {
  it("sends the compact tick shape without a room", () => {
    const out = getTickCharacterState(makeCharacter());
    expect(Object.keys(out)).toEqual(["id", "d", "state", "x", "y", "vx", "vy"]);
    expect(out).toMatchObject({ id: "sock-1", d: 2, x: 10.5, y: 20.25, vx: 0.5, vy: -1 });
  });

  it("only keeps the tick subset of state", () => {
    const out = getTickCharacterState(makeCharacter());
    expect(out.state.isAiming).toBe(true);
    expect(out.state).not.toHaveProperty("secret");
    expect(out.state).not.toHaveProperty("hasBuffChanges");
  });

  it("defaults missing velocity and position to 0 and unknown facing to down", () => {
    const out = getTickCharacterState(
      makeCharacter({
        vx: undefined,
        vy: undefined,
        x: undefined,
        direction: undefined,
      } as unknown as Partial<CharacterSyncInput>),
    );
    expect(out).toMatchObject({ x: 0, vx: 0, vy: 0, d: 1 });
  });
});

describe("getTickStateLite", () => {
  it("is empty without state", () => {
    expect(getTickStateLite({ state: undefined } as unknown as CharacterSyncInput)).toEqual({});
  });
});

describe("getBuffCharacterState", () => {
  it("packs buff fields and clears the change flag", () => {
    const p = makeCharacter();
    const out = getBuffCharacterState(p);
    expect(Object.keys(out)).toEqual([
      "id",
      "socketId",
      "state",
      "stats",
      "buffs",
      "activeItemSlots",
    ]);
    expect(out.id).toBe("sock-1");
    expect(p.state.hasBuffChanges).toBe(false);
    expect(out.state).toBe(p.state);
  });
});

describe("getLootTickWire", () => {
  it("sends only the id until the loot has expired", () => {
    expect(getLootTickWire({ id: "l1" })).toEqual({ id: "l1" });
    expect(Object.keys(getLootTickWire({ id: "l1", expiredSince: null }))).toEqual(["id"]);
    expect(getLootTickWire({ id: "l1", expiredSince: 0 })).toEqual({ id: "l1", expiredSince: 0 });
  });
});
