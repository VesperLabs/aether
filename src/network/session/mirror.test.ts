import { describe, expect, it } from "vitest";
import {
  CHAT_LIMIT,
  applyMessage,
  applyPoses,
  applyStatuses,
  createMirror,
  getSelf,
} from "./mirror";
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
  const mirror = createMirror();
  applyMessage(mirror, "heroInit", {
    socketId: "hero",
    players: [character("hero", 0), character("other", 1)],
    npcs: [character("rat", 2)],
    loots: [loot("a"), loot("old", { expiredSince: 5 })],
  });
  return mirror;
}

describe("mirror", () => {
  it("builds the room from heroInit", () => {
    const mirror = loggedIn();
    expect(mirror.selfId).toBe("hero");
    expect(mirror.roomName).toBe("grassland");
    expect(getSelf(mirror)?.gold).toBe(5);
    expect([...mirror.players.keys()]).toEqual(["hero", "other"]);
    expect([...mirror.npcs.keys()]).toEqual(["rat"]);
    expect([...mirror.loots.keys()]).toEqual(["a"]);
  });

  it("replaces the room on a second heroInit", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "heroInit", {
      socketId: "hero",
      players: [character("hero", 0, { roomName: "cave" })],
      npcs: [],
      loots: [],
    });
    expect(mirror.roomName).toBe("cave");
    expect(mirror.players.size).toBe(1);
    expect(mirror.npcs.size).toBe(0);
  });

  it("tracks players joining, updating and leaving", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "playerJoin", character("new", 3));
    applyMessage(mirror, "playerUpdate", character("new", 3, { gold: 99 }));
    expect(mirror.players.get("new")?.gold).toBe(99);
    applyMessage(mirror, "remove", "new");
    expect(mirror.players.has("new")).toBe(false);
    expect(mirror.idsByNetId.has(3)).toBe(false);
  });

  it("remembers when a player last teleported", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "playerJoin", character("new", 3), { lastTeleport: 42 });
    applyMessage(mirror, "playerUpdate", character("new", 3, { gold: 1 }));
    expect(mirror.players.get("new")?.lastTeleport).toBe(42);
  });

  it("tracks npcs and loot", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "npcJoin", character("bat", 4));
    applyMessage(mirror, "respawnNpc", { id: "rat", x: 50, y: 60, respawnTime: 1 });
    expect(mirror.npcs.get("rat")).toMatchObject({ x: 50, y: 60, lastTeleport: 1 });
    applyMessage(mirror, "lootSpawned", { loot: loot("b"), npcId: "rat" });
    expect(mirror.loots.get("b")).toMatchObject({ x: 50, y: 60 });
    applyMessage(mirror, "npcRemove", "bat");
    expect(mirror.npcs.has("bat")).toBe(false);
    applyMessage(mirror, "lootExpired", "a");
    applyMessage(mirror, "lootGrabbed", {
      socketId: "hero",
      loot: loot("b"),
      player: character("hero", 0, { gold: 7 }),
    });
    expect(mirror.loots.size).toBe(0);
    expect(getSelf(mirror)?.gold).toBe(7);
  });

  it("merges buff updates and position corrections", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "buffUpdate", {
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
    applyMessage(mirror, "positionCorrection", { x: 5, y: 6 });
    expect(getSelf(mirror)).toMatchObject({ x: 5, y: 6, stats: { hp: 3 }, gold: 5 });
  });

  it("keeps recent chat", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "message");
    for (let i = 0; i < CHAT_LIMIT + 5; i++) {
      applyMessage(mirror, "message", { type: "chat", message: `m${i}` });
    }
    expect(mirror.chat).toHaveLength(CHAT_LIMIT);
    expect(mirror.chat.at(-1)?.message).toBe(`m${CHAT_LIMIT + 4}`);
  });

  it("moves characters from binary poses and drops stale ticks", () => {
    const mirror = loggedIn();
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
    applyPoses(mirror, tick(100, 1000));
    applyPoses(mirror, tick(1, 500));
    expect(getSelf(mirror)).toMatchObject({ x: 100, y: 2, vx: 1 });
    expect(mirror.npcs.get("rat")).toMatchObject({ x: 30, y: 40 });
    expect(mirror.poseTime).toBe(1000);
  });

  it("applies statuses", () => {
    const mirror = loggedIn();
    applyStatuses(mirror, {
      p: [{ id: "hero", state: { isAiming: true }, v: [4, 10, 2, 5, 1, 3] }],
      n: [{ id: "unknown", state: {}, v: [0, 0, 0, 0, 0, 0] }],
    });
    expect(getSelf(mirror)?.vitals).toEqual({ hp: 4, maxHp: 10, mp: 2, maxMp: 5, sp: 1, maxSp: 3 });
    expect(getSelf(mirror)?.state.isAiming).toBe(true);
  });
});

describe("applyMessage routing", () => {
  it("routes statuses through applyMessage", () => {
    const mirror = loggedIn();
    applyMessage(mirror, "statuses", {
      p: [{ id: "hero", state: { isDead: true }, v: [4, 10, 2, 5, 1, 3] }],
    });
    expect(getSelf(mirror)?.state?.isDead).toBe(true);
  });

  it("leaves state alone for ignored messages", () => {
    const mirror = createMirror();
    applyMessage(mirror, "knockedBack", { angle: 1 });
    expect(mirror).toEqual(createMirror());
  });
});
