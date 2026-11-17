import { describe, expect, it } from "vitest";
import {
  getBuffCharacterState,
  getFullCharacterState,
  getPublicCharacterState,
  getRoomMateState,
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
    getQuests: () => [{ id: "q" }],
    ...over,
  };
}

describe("getFullCharacterState", () => {
  it("packs the wire keys in a stable order", () => {
    expect(Object.keys(getFullCharacterState(makeCharacter()))).toEqual([
      "id",
      "socketId",
      "nid",
      "peerId",
      "roomName",
      "x",
      "y",
      "vx",
      "vy",
      "direction",
      "stats",
      "offHandStats",
      "state",
      "equipment",
      "inventory",
      "profile",
      "kind",
      "aggressive",
      "talks",
      "habitat",
      "charClass",
      "npcKills",
      "buffs",
      "quests",
      "abilities",
      "activeItemSlots",
      "gold",
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
describe("who sees what", () => {
  const getQuests = () => [{ id: "q" }];
  const character = () =>
    makeCharacter({ inventory: [{ id: "sword" }], gold: 50, npcKills: { rat: 2 }, getQuests });

  it("shows a player's bag, gold, quests and kills only to that player", () => {
    expect(getFullCharacterState(character())).toMatchObject({
      inventory: [{ id: "sword" }],
      gold: 50,
      npcKills: { rat: 2 },
      quests: [{ id: "q" }],
    });
    for (const pack of [getRoomMateState, getPublicCharacterState]) {
      expect(pack(character())).toMatchObject({ inventory: [], gold: 0, npcKills: {}, quests: [] });
    }
  });

  it("gives room mates the peer id for video chat, but not observers", () => {
    expect(getRoomMateState(character()).peerId).toBe("peer-1");
    expect(getPublicCharacterState(character()).peerId).toBeUndefined();
  });

  it("never reads quests for anyone but the player", () => {
    let reads = 0;
    const counted = makeCharacter({ getQuests: () => (reads++, []) });
    getRoomMateState(counted);
    getPublicCharacterState(counted);
    expect(reads).toBe(0);
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
      "offHandStats",
      "buffs",
      "activeItemSlots",
    ]);
    expect(out.id).toBe("sock-1");
    expect(p.state.hasBuffChanges).toBe(false);
    expect(out.state).toBe(p.state);
  });
});
