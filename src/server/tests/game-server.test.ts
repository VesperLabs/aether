// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { once, settle, startTestServer, type TestServer } from "./test-server";

/**
 * Boots the real game server in-process (offline mode, fake database) on a random port
 * and talks to it with a socket.io client, like the browser does.
 */
let server: TestServer;

type Anything = any;

/** Like `once`, but skips events that don't match, e.g. map loot spawning in the same room. */
function onceMatching<T = Anything>(
  socket: Socket,
  event: string,
  matches: (...args: T[]) => boolean,
  timeoutMs = 5000,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const listener = (...args: T[]) => {
      if (!matches(...args)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(args);
    };
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`timed out waiting for "${event}"`));
    }, timeoutMs);
    socket.on(event, listener);
  });
}

async function login(charClass = "warrior") {
  const socket = await server.connect();
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  const [state, meta] = await heroInit;
  return { socket, state, meta };
}

/** The live loot on the ground, straight from the world. */
const serverLoots = (): Record<string, Anything> => server.world.loots;

const ping = (socket: Socket) => settle(socket).then(() => true);

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("game server", () => {
  it("demoLogin sends heroInit with the hero and room state", async () => {
    const { socket, state, meta } = await login("warrior");
    expect(meta).toEqual({ isLogin: true });
    expect(state.socketId).toBe(socket.id);
    expect(state.userSettings).toBeTruthy();
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    expect(hero).toBeTruthy();
    expect(hero.charClass).toBe("warrior");
    expect(hero.stats.maxHp).toBeGreaterThan(0);
    expect(hero.equipment.armor.base).toBe("robe");
    expect(Array.isArray(state.npcs)).toBe(true);
  });

  it("demoLogin without a class answers with a formError", async () => {
    const socket = await server.connect();
    const error = once(socket, "formError");
    socket.emit("demoLogin", {});
    expect((await error)[0]).toEqual({ error: "No class" });
  });

  it("answers latency pings with an ack", async () => {
    const { socket } = await login("rogue");
    expect(await ping(socket)).toBe(true);
  });

  it("broadcasts chat messages to the room", async () => {
    const { socket } = await login("mage");
    const message = once(socket, "message");
    socket.emit("message", { message: "hello world" });
    const [msg] = await message;
    expect(msg).toMatchObject({ type: "chat", message: "hello world" });
  });

  it("moveItem moves an equipped item to the inventory and broadcasts playerUpdate", async () => {
    const { socket, state } = await login("warrior");
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    const armorId = hero.equipment.armor.id;
    const update = once(socket, "playerUpdate");
    socket.emit("moveItem", {
      from: { location: "equipment", slot: "armor" },
      to: { location: "inventory", slot: 0 },
    });
    const [player] = await update;
    expect(player.equipment.armor).toBeFalsy();
    expect(player.inventory[0].id).toBe(armorId);
  });

  it("dropItem removes an equipped item from the hero", async () => {
    const { socket, state } = await login("warrior");
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    const update = once(socket, "playerUpdate");
    socket.emit("dropItem", {
      location: "equipment",
      item: { id: hero.equipment.armor.id },
    });
    const [player] = await update;
    expect(player.equipment.armor).toBeFalsy();
  });

  it("consumeItem on a missing item is ignored", async () => {
    const { socket } = await login("cleric");
    socket.emit("consumeItem", { location: "inventory", item: { id: "nope" } });
    expect(await ping(socket)).toBe(true);
  });

  it("drops payloads that do not match the command schema", async () => {
    const { socket } = await login("warrior");
    socket.emit("moveItem" as never, "garbage" as never);
    socket.emit("playerInput" as never, { x: "far", y: 1, vx: 0, vy: 0 } as never);
    socket.emit("message" as never, { message: 42 } as never);
    expect(await ping(socket)).toBe(true);
  });

  it("survives a command from a socket that never logged in", async () => {
    const socket = await server.connect();
    socket.emit("attack", { count: 1 });
    expect(await ping(socket)).toBe(true);
  });

  it("treats admin chat commands as plain chat unless DEBUG is true", async () => {
    const { socket } = await login("rogue");
    const chat = once(socket, "message");
    socket.emit("message", { message: "/coords" });
    expect((await chat)[0]).toMatchObject({ type: "chat", message: "/coords" });

    process.env.ENABLE_CHEATS = "true";
    try {
      const info = once(socket, "message");
      socket.emit("message", { message: "/coords" });
      expect((await info)[0]).toMatchObject({ type: "info" });
    } finally {
      delete process.env.ENABLE_CHEATS;
    }
  });

  it("a dropped item lands on the ground and grabLoot picks it back up", async () => {
    const { socket, state } = await login("warrior");
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    const armorId = hero.equipment.armor.id;
    const spawned = onceMatching(
      socket,
      "lootSpawned",
      ({ loot }: Anything) => loot.item.id === armorId,
    );
    socket.emit("dropItem", { location: "equipment", item: { id: armorId } });
    const [{ loot, npcId }] = await spawned;
    expect(npcId).toBeFalsy();
    expect(loot.item.id).toBe(armorId);
    expect(serverLoots()[loot.id]).toBeTruthy();

    const grabbed = once(socket, "lootGrabbed");
    socket.emit("grabLoot", { lootId: loot.id, direction: "left" });
    const [result] = await grabbed;
    expect(result.socketId).toBe(socket.id);
    expect(result.loot.id).toBe(loot.id);
    expect(result.player.inventory.some((i: Anything) => i?.id === armorId)).toBe(true);
    expect(serverLoots()[loot.id]).toBeUndefined();
  });

  it("grabLoot ignores loot that is gone or expired", async () => {
    const { socket, state } = await login("warrior");
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    const armorId = hero.equipment.armor.id;
    const spawned = onceMatching(
      socket,
      "lootSpawned",
      ({ loot }: Anything) => loot.item.id === armorId,
    );
    socket.emit("dropItem", { location: "equipment", item: { id: armorId } });
    const [{ loot }] = await spawned;
    serverLoots()[loot.id].expiredSince = server.clock.now();

    let grabbed = false;
    socket.on("lootGrabbed", () => (grabbed = true));
    socket.emit("grabLoot", { lootId: loot.id, direction: "left" });
    socket.emit("grabLoot", { lootId: "does-not-exist", direction: "left" });
    expect(await ping(socket)).toBe(true);
    expect(grabbed).toBe(false);
    expect(serverLoots()[loot.id]).toBeTruthy();
  });

  describe("grabLoot range and room", () => {
    async function dropArmor() {
      const { socket, state } = await login("warrior");
      const hero = state.players.find((p: Anything) => p.socketId === socket.id);
      const armorId = hero.equipment.armor.id;
      const spawned = onceMatching(
        socket,
        "lootSpawned",
        ({ loot }: Anything) => loot.item.id === armorId,
      );
      socket.emit("dropItem", { location: "equipment", item: { id: armorId } });
      const [{ loot }] = await spawned;
      const player = server.world.players[socket.id as string];
      return { socket, loot, player };
    }
    async function grabIsIgnored(socket: Socket, lootId: string) {
      let grabbed = false;
      socket.on("lootGrabbed", () => (grabbed = true));
      socket.emit("grabLoot", { lootId, direction: "left" });
      expect(await ping(socket)).toBe(true);
      expect(grabbed).toBe(false);
      expect(serverLoots()[lootId]).toBeTruthy();
    }

    it("fails from too far away", async () => {
      const { socket, loot, player } = await dropArmor();
      player.x = loot.x + 500;
      await grabIsIgnored(socket, loot.id);
    });
    it("fails from another room", async () => {
      const { socket, loot, player } = await dropArmor();
      player.roomName = "some-other-room";
      await grabIsIgnored(socket, loot.id);
    });
    it("succeeds from close by", async () => {
      const { socket, loot, player } = await dropArmor();
      player.x = loot.x + 30;
      const grabbed = once(socket, "lootGrabbed");
      socket.emit("grabLoot", { lootId: loot.id, direction: "left" });
      const [result] = await grabbed;
      expect(result.loot.id).toBe(loot.id);
      expect(serverLoots()[loot.id]).toBeUndefined();
    });
  });
});
