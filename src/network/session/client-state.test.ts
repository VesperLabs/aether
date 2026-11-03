import { describe, expect, it } from "vitest";
import {
  CHAT_LIMIT,
  applyMessage,
  applyPoses,
  applyStatuses,
  createClientState,
  getSelf,
} from "./client-state";
import type { LootMessage } from "@/network/messages";
import type { FullCharacterWire } from "@/network/sync/character-state";
import { encodeRoomPoses } from "@/network/sync/poses";

const character = (id: string, nid: number, extra: Partial<FullCharacterWire> = {}) =>
  ({
    id,
    socketId: id,
    nid,
    roomName: "grassland",
    x: 10,
    y: 20,
    vx: 0,
    vy: 0,
    direction: "down",
    state: {},
    stats: { hp: 10 },
    inventory: [],
    gold: 5,
    bodySize: 8,
    ...extra,
  }) as FullCharacterWire;

const loot = (id: string, extra: Partial<LootMessage> = {}) =>
  ({ id, roomName: "grassland", x: 1, y: 2, dropTime: 0, ...extra }) as LootMessage;

function loggedIn() {
  const clientState = createClientState();
  applyMessage(clientState, "heroInit", {
    socketId: "hero",
    players: [character("hero", 0), character("other", 1)],
    npcs: [character("rat", 2)],
    loots: [loot("a"), loot("old", { expiredSince: 5 })],
  });
  return clientState;
}

describe("client state", () => {
  it("builds the room from heroInit", () => {
    const clientState = loggedIn();
    expect(clientState.selfId).toBe("hero");
    expect(clientState.roomName).toBe("grassland");
    expect(getSelf(clientState)?.gold).toBe(5);
    expect([...clientState.players.keys()]).toEqual(["hero", "other"]);
    expect([...clientState.npcs.keys()]).toEqual(["rat"]);
    expect([...clientState.loots.keys()]).toEqual(["a"]);
  });

  it("replaces the room on a second heroInit", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "heroInit", {
      socketId: "hero",
      players: [character("hero", 0, { roomName: "cave" })],
      npcs: [],
      loots: [],
    });
    expect(clientState.roomName).toBe("cave");
    expect(clientState.players.size).toBe(1);
    expect(clientState.npcs.size).toBe(0);
  });

  it("tracks players joining, updating and leaving", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "playerJoin", character("new", 3));
    applyMessage(clientState, "playerUpdate", character("new", 3, { gold: 99 }));
    expect(clientState.players.get("new")?.gold).toBe(99);
    applyMessage(clientState, "remove", "new");
    expect(clientState.players.has("new")).toBe(false);
    expect(clientState.idsByNetId.has(3)).toBe(false);
  });

  it("remembers when a player last teleported", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "playerJoin", character("new", 3), { lastTeleport: 42 });
    applyMessage(clientState, "playerUpdate", character("new", 3, { gold: 1 }));
    expect(clientState.players.get("new")?.lastTeleport).toBe(42);
  });

  it("tracks npcs and loot", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "npcJoin", character("bat", 4));
    applyMessage(clientState, "respawnNpc", { id: "rat", x: 50, y: 60, respawnTime: 1 });
    expect(clientState.npcs.get("rat")).toMatchObject({ x: 50, y: 60, lastTeleport: 1 });
    applyMessage(clientState, "lootSpawned", { loot: loot("b"), npcId: "rat" });
    expect(clientState.loots.get("b")).toMatchObject({ x: 50, y: 60 });
    applyMessage(clientState, "npcRemove", "bat");
    expect(clientState.npcs.has("bat")).toBe(false);
    applyMessage(clientState, "lootExpired", "a");
    applyMessage(clientState, "lootGrabbed", {
      socketId: "hero",
      loot: loot("b"),
      player: character("hero", 0, { gold: 7 }),
    });
    expect(clientState.loots.size).toBe(0);
    expect(getSelf(clientState)?.gold).toBe(7);
  });

  it("merges buff updates and position corrections", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "buffUpdate", {
      players: [
        {
          id: "hero",
          socketId: "hero",
          state: {},
          stats: { hp: 3 },
          buffs: [],
          activeItemSlots: [],
        },
      ],
    });
    applyMessage(clientState, "positionCorrection", { x: 5, y: 6 });
    expect(getSelf(clientState)).toMatchObject({ x: 5, y: 6, stats: { hp: 3 }, gold: 5 });
  });

  it("keeps recent chat", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "message");
    for (let i = 0; i < CHAT_LIMIT + 5; i++) {
      applyMessage(clientState, "message", { type: "chat", message: `m${i}` });
    }
    expect(clientState.chat).toHaveLength(CHAT_LIMIT);
    expect(clientState.chat.at(-1)?.message).toBe(`m${CHAT_LIMIT + 4}`);
  });

  it("moves characters from binary poses and drops stale ticks", () => {
    const clientState = loggedIn();
    const room = { name: "grassland" };
    const tick = (x: number, t: number) =>
      encodeRoomPoses(
        {
          players: { hero: { nid: 0, room, x, y: 2, vx: 1, vy: 0 } },
          npcs: { rat: { nid: 2, room, x: 30, y: 40 }, ghost: { nid: 9, room, x: 0, y: 0 } },
        },
        "grassland",
        t,
      );
    applyPoses(clientState, tick(100, 1000));
    applyPoses(clientState, tick(1, 500));
    expect(getSelf(clientState)).toMatchObject({ x: 100, y: 2, vx: 1 });
    expect(clientState.npcs.get("rat")).toMatchObject({ x: 30, y: 40 });
    expect(clientState.poseTime).toBe(1000);
  });

  it("keeps the latest poses for interpolation, without bumping the revision", () => {
    const clientState = loggedIn();
    const revision = clientState.revision;
    const room = { name: "grassland" };
    const data = encodeRoomPoses(
      { players: { hero: { nid: 0, room, x: 7, y: 8, vx: 0, vy: 0 } }, npcs: {} },
      "grassland",
      2000,
    );
    applyMessage(clientState, "poses", data);
    expect(clientState.poses?.t).toBe(2000);
    expect(clientState.poses?.p[0]?.[0]).toBe("hero");
    expect(clientState.revision).toBe(revision);
  });

  it("applies statuses", () => {
    const clientState = loggedIn();
    applyStatuses(clientState, {
      p: [{ id: "hero", state: { isAiming: true }, v: [4, 10, 2, 5, 1, 3] }],
      n: [{ id: "unknown", state: {}, v: [0, 0, 0, 0, 0, 0] }],
    });
    expect(getSelf(clientState)?.vitals).toEqual({
      hp: 4,
      maxHp: 10,
      mp: 2,
      maxMp: 5,
      sp: 1,
      maxSp: 3,
    });
    expect(getSelf(clientState)?.state.isAiming).toBe(true);
  });

  it("replaces a character on a status and drops its vitals when whole data arrives", () => {
    const clientState = loggedIn();
    const before = getSelf(clientState);
    applyStatuses(clientState, { p: [{ id: "hero", state: {}, v: [4, 10, 2, 5, 1, 3] }] });
    expect(getSelf(clientState)).not.toBe(before);
    expect(before?.vitals).toBeUndefined();
    applyMessage(clientState, "playerUpdate", character("hero", 0, { stats: { hp: 10 } }));
    expect(getSelf(clientState)?.vitals).toBeUndefined();
    expect(getSelf(clientState)?.stats.hp).toBe(10);
  });
});

describe("applyMessage routing", () => {
  it("tracks the party and clears it when the hero leaves", () => {
    const clientState = loggedIn();
    const party = { id: "p", leaderId: "hero", members: [] } as never;
    applyMessage(clientState, "partyUpdate", { party });
    expect(clientState.party).toBe(party);
    applyMessage(clientState, "partyUpdate", { party: null });
    expect(clientState.party).toBeNull();
  });

  it("takes the hero's quests from keeper data", () => {
    const clientState = loggedIn();
    const quests = [{ questId: "q1" }];
    applyMessage(clientState, "keeperDataUpdate", {
      npcId: "rat",
      keeperData: {} as never,
      playerQuests: quests,
    });
    expect(getSelf(clientState)?.quests).toBe(quests);
  });

  it("bumps the revision for every handled message", () => {
    const clientState = loggedIn();
    const revision = clientState.revision;
    applyMessage(clientState, "lootExpired", "a");
    expect(clientState.revision).toBe(revision + 1);
  });

  it("routes statuses through applyMessage", () => {
    const clientState = loggedIn();
    applyMessage(clientState, "statuses", {
      p: [{ id: "hero", state: { isDead: true }, v: [4, 10, 2, 5, 1, 3] }],
    });
    expect(getSelf(clientState)?.state?.isDead).toBe(true);
  });

  it("leaves state alone for ignored messages", () => {
    const clientState = createClientState();
    applyMessage(clientState, "knockedBack", { angle: 1 });
    expect(clientState).toEqual(createClientState());
  });
});
