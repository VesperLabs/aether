// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/shared/content";
import { NPC_TALK_LATENCY_TOLERANCE, NPC_TALK_RANGE } from "@/shared/rules/npc-behavior";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Chat, shop and home commands only work next to the keeper. */
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

/** Resolves true if the event arrives within `ms`, false otherwise. */
const arrives = (socket: Socket, event: string, ms = 300) =>
  once(socket, event, ms).then(
    () => true,
    () => false,
  );

async function login() {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass: "warrior" });
  await heroInit;
  const world = gameServer.world as Anything;
  return { socket, world, player: world.players[socket.id as string] };
}

const FAR = NPC_TALK_RANGE + NPC_TALK_LATENCY_TOLERANCE + 200;

function placeKeeper(world: Anything, player: Anything, id: string, dx: number, extra = {}) {
  const shop = [
    {
      item: {
        ...ItemBuilder.buildItem("pants", "common", "clothPants")!,
        cost: 40,
      },
      stock: 10,
    },
  ];
  world.npcs[id] = {
    id,
    fake: true,
    getQuests: () => [],
    name: id,
    x: player.x + dx,
    y: player.y,
    room: { name: player.roomName },
    talkingIds: [],
    keeperData: { shop, home: { x: 11, y: 22 }, ...extra },
  };
  return world.npcs[id];
}

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterEach(() => {
  const world = gameServer.world as Anything;
  for (const id of Object.keys(world.npcs)) if (world.npcs[id].fake) delete world.npcs[id];
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.close();
});

describe("chatNpc", () => {
  it("opens the keeper when close, and refuses far away, unknown or other-room npcs", async () => {
    const { socket, world, player } = await login();
    const near = placeKeeper(world, player, "near-keeper", 20);
    placeKeeper(world, player, "far-keeper", FAR);
    const other = placeKeeper(world, player, "other-room-keeper", 20);
    other.room = { name: "somewhere-else" };

    for (const npcId of ["far-keeper", "other-room-keeper", "missing", undefined]) {
      const reply = arrives(socket, "keeperDataUpdate");
      socket.emit("chatNpc", { npcId });
      expect(await reply).toBe(false);
    }
    expect(player.state.targetNpcId).not.toBe("far-keeper");

    const reply = once(socket, "keeperDataUpdate");
    socket.emit("chatNpc", { npcId: "near-keeper" });
    expect((await reply)[0].npcId).toBe("near-keeper");
    expect(near.talkingIds).toContain(socket.id);
    expect(player.state.targetNpcId).toBe("near-keeper");
  });
});

describe("shop range", () => {
  const buy = {
    from: { location: "shop", slot: 0 },
    to: { location: "inventory", slot: 0 },
  };

  it("refuses buying once the player is far from the keeper", async () => {
    const { socket, world, player } = await login();
    placeKeeper(world, player, "shop-a", 20);
    player.state.targetNpcId = "shop-a";
    player.gold = 1000;
    player.inventory = [];

    const bought = once(socket, "playerUpdate");
    socket.emit("moveItem", buy);
    expect((await bought)[0].inventory[0].base).toBe("pants");

    world.npcs["shop-a"].x = player.x + FAR;
    player.gold = 1000;
    player.inventory = [];
    const refused = arrives(socket, "playerUpdate");
    socket.emit("moveItem", buy);
    expect(await refused).toBe(false);
    expect(player.inventory[0]).toBeFalsy();
    expect(player.gold).toBe(1000);
  });

  it("refuses when the keeper is in another room or gone", async () => {
    const { socket, world, player } = await login();
    placeKeeper(world, player, "shop-b", 20).room = { name: "elsewhere" };
    player.state.targetNpcId = "shop-b";
    player.gold = 1000;
    const refused = arrives(socket, "playerUpdate");
    socket.emit("moveItem", buy);
    expect(await refused).toBe(false);
    delete world.npcs["shop-b"];
    const refusedGone = arrives(socket, "playerUpdate");
    socket.emit("moveItem", buy);
    expect(await refusedGone).toBe(false);
    expect(player.inventory[0]).toBeFalsy();
  });
});

describe("setSpawn", () => {
  it("ignores the client coordinates and uses the keeper's home", async () => {
    const { socket, world, player } = await login();
    placeKeeper(world, player, "home-keeper", 20);
    player.state.targetNpcId = "home-keeper";
    const info = once(socket, "message");
    socket.emit("setSpawn", { x: 9999, y: 9999, roomName: "anywhere" });
    expect((await info)[0].type).toBe("info");
    expect(player.spawn).toMatchObject({
      x: 11,
      y: 22,
      roomName: player.roomName,
    });
  });

  it("refuses from far away, without a home, or without a target", async () => {
    const { socket, world, player } = await login();
    const before = player.spawn;
    const keeper = placeKeeper(world, player, "home-far", FAR);
    player.state.targetNpcId = "home-far";
    socket.emit("setSpawn", { x: 1, y: 2, roomName: "x" });
    expect(await arrives(socket, "message")).toBe(false);

    keeper.x = player.x;
    keeper.keeperData.home = undefined;
    socket.emit("setSpawn", { x: 1, y: 2, roomName: "x" });
    expect(await arrives(socket, "message")).toBe(false);

    player.state.targetNpcId = null;
    socket.emit("setSpawn", { x: 1, y: 2, roomName: "x" });
    expect(await arrives(socket, "message")).toBe(false);
    expect(player.spawn).toEqual(before);
  });
});
