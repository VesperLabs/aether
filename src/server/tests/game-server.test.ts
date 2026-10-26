// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "../phaser";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/**
 * Boots the real game server in-process (offline mode, fake database) on a random port
 * and talks to it with a socket.io client, like the browser does.
 */
let httpServer: http.Server;
let gameServer: GameServer;
let url: string;
const sockets: Socket[] = [];

type Anything = any;

function once<T = Anything>(socket: Socket, event: string, timeoutMs = 5000): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (...args: T[]) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

async function connectSocket() {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  return socket;
}

async function login(charClass = "warrior") {
  const socket = await connectSocket();
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  const [state, meta] = await heroInit;
  return { socket, state, meta };
}

/** The live loot on the ground, straight from the scene. */
const serverLoots = (): Record<string, Anything> =>
  (gameServer.game.scene.getScene("ServerScene") as Anything).loots;

const ping = (socket: Socket) =>
  new Promise<boolean>((resolve) => socket.emit("latency", () => resolve(true)));

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.game?.destroy(true);
  gameServer?.io?.close();
});

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
    const socket = await connectSocket();
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
    socket.emit("dropItem", { location: "equipment", item: { id: hero.equipment.armor.id } });
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
    const socket = await connectSocket();
    socket.emit("attack", { count: 1 });
    expect(await ping(socket)).toBe(true);
  });

  it("treats admin chat commands as plain chat unless DEBUG is true", async () => {
    const { socket } = await login("rogue");
    const chat = once(socket, "message");
    socket.emit("message", { message: "/coords" });
    expect((await chat)[0]).toMatchObject({ type: "chat", message: "/coords" });

    process.env.DEBUG = "true";
    try {
      const info = once(socket, "message");
      socket.emit("message", { message: "/coords" });
      expect((await info)[0]).toMatchObject({ type: "info" });
    } finally {
      delete process.env.DEBUG;
    }
  });

  it("a dropped item lands on the ground and grabLoot picks it back up", async () => {
    const { socket, state } = await login("warrior");
    const hero = state.players.find((p: Anything) => p.socketId === socket.id);
    const armorId = hero.equipment.armor.id;
    const spawned = once(socket, "lootSpawned");
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
    const spawned = once(socket, "lootSpawned");
    socket.emit("dropItem", { location: "equipment", item: { id: hero.equipment.armor.id } });
    const [{ loot }] = await spawned;
    serverLoots()[loot.id].expiredSince = Date.now();

    let grabbed = false;
    socket.on("lootGrabbed", () => (grabbed = true));
    socket.emit("grabLoot", { lootId: loot.id, direction: "left" });
    socket.emit("grabLoot", { lootId: "does-not-exist", direction: "left" });
    expect(await ping(socket)).toBe(true);
    expect(grabbed).toBe(false);
    expect(serverLoots()[loot.id]).toBeTruthy();
  });
});
