// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Quest flow over real sockets against the in-process game server (offline mode, fake database). */
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

async function login(charClass = "warrior") {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  const [state] = await heroInit;
  return { socket, state };
}

const world = (): Anything => gameServer.world;

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.close();
});

describe("quests", () => {
  it("acceptQuest adds the quest to the hero once", async () => {
    const { socket } = await login();
    const update = once(socket, "playerUpdate");
    socket.emit("acceptQuest", "crab-catching");
    const [player] = await update;
    expect(player.quests).toHaveLength(1);
    expect(player.quests[0]).toMatchObject({
      questId: "crab-catching",
      isCompleted: false,
    });
    expect(player.quests[0].objectives[0]).toMatchObject({ numKilled: 0, isReady: false });

    /* Accepting again changes nothing (and sends no update). */
    socket.emit("acceptQuest", "crab-catching");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(world().players[socket.id].quests).toHaveLength(1);
  });

  it("completeQuest refuses a quest that is not finished", async () => {
    const { socket } = await login();
    socket.emit("acceptQuest", "crab-catching");
    await once(socket, "playerUpdate");
    const message = once(socket, "message");
    socket.emit("completeQuest", "crab-catching");
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Quest objectives are not complete.",
    });
  });

  it("completeQuest rewards a finished quest and refuses a second turn-in", async () => {
    const { socket } = await login();
    socket.emit("acceptQuest", "crab-catching");
    await once(socket, "playerUpdate");

    const player = world().players[socket.id];
    player.npcKills.crab = 60;
    const goldBefore = player.gold;
    const expBefore = player.stats.exp;
    const inventoryBefore = player.inventory.filter(Boolean).length;

    const update = once(socket, "playerUpdate");
    socket.emit("completeQuest", "crab-catching");
    const [state, meta] = await update;
    expect(meta).toEqual({ didLevel: false });
    expect(state.quests[0]).toMatchObject({ questId: "crab-catching", isCompleted: true });
    expect(state.gold).toBe(goldBefore + 5);
    expect(state.stats.exp).toBe(expBefore + 25);
    expect(state.inventory.filter(Boolean)).toHaveLength(inventoryBefore + 1);
    expect(state.inventory.some((i: Anything) => i?.key === "clothGloves")).toBe(true);

    const message = once(socket, "message");
    socket.emit("completeQuest", "crab-catching");
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Quest has already been completed.",
    });
  });

  it("completeQuest fails when the reward does not fit and the inventory is full", async () => {
    const { socket } = await login();
    socket.emit("acceptQuest", "crab-catching");
    await once(socket, "playerUpdate");
    const player = world().players[socket.id];
    player.npcKills.crab = 60;
    player.inventory = Array.from({ length: 32 }, (_, i) => ({ id: `junk-${i}`, base: "junk" }));

    const message = once(socket, "message");
    socket.emit("completeQuest", "crab-catching");
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Cannot turn in quest. Inventory is full",
    });
    expect(player.quests[0].isCompleted).toBe(false);
  });

  it("counts mob kills for every recipient of a mobKilled event", async () => {
    const { socket } = await login();
    const player = world().players[socket.id];
    const kill = (mobName: string) => ({
      killerId: socket.id as string,
      killerLevel: 1,
      killerMagicFind: 0,
      recipientIds: [socket.id as string, "someone-who-left"],
      mobId: "m1",
      mobName,
      mobLevel: 1,
      roomName: player.roomName,
      x: 0,
      y: 0,
    });
    const expBefore = player.stats.exp;
    world().events.emit("mobKilled", kill("crab"));
    world().events.emit("mobKilled", kill("crab"));
    world().events.emit("mobKilled", kill("fish"));
    expect(player.npcKills).toMatchObject({ crab: 2, fish: 1 });
    expect(player.stats.exp).toBeGreaterThan(expBefore);
  });
});
