// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder, PREVIEW_DICE } from "@/content";
import { NPC_TALK_LATENCY_TOLERANCE, NPC_TALK_RANGE } from "@/rules/npc-behavior";
import { once, replies, startTestServer, type TestServer } from "./test-server";

/** Chat, shop and home commands only work next to the keeper. */
let server: TestServer;

type Anything = any;

const login = () => server.login();

const FAR = NPC_TALK_RANGE + NPC_TALK_LATENCY_TOLERANCE + 200;

function placeKeeper(world: Anything, player: Anything, id: string, dx: number, extra = {}) {
  const shop = [
    {
      item: {
        ...ItemBuilder.buildItem(PREVIEW_DICE, "pants", "common", "clothPants")!,
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
  server = await startTestServer();
}, 60000);

afterEach(() => {
  const world = server.world;
  for (const id of Object.keys(world.npcs)) if (world.npcs[id].fake) delete world.npcs[id];
});

afterAll(() => server?.close());

describe("chatNpc", () => {
  it("opens the keeper when close, and refuses far away, unknown or other-room npcs", async () => {
    const { socket, world, player } = await login();
    const near = placeKeeper(world, player, "near-keeper", 20);
    placeKeeper(world, player, "far-keeper", FAR);
    const other = placeKeeper(world, player, "other-room-keeper", 20);
    other.room = { name: "somewhere-else" };

    for (const npcId of ["far-keeper", "other-room-keeper", "missing", undefined]) {
      const opened = await replies(socket, "keeperDataUpdate", () =>
        socket.emit("chatNpc", { npcId }),
      );
      expect(opened).toBe(false);
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
    expect(await replies(socket, "playerUpdate", () => socket.emit("moveItem", buy))).toBe(false);
    expect(player.inventory[0]).toBeFalsy();
    expect(player.gold).toBe(1000);
  });

  it("refuses when the keeper is in another room or gone", async () => {
    const { socket, world, player } = await login();
    placeKeeper(world, player, "shop-b", 20).room = { name: "elsewhere" };
    player.state.targetNpcId = "shop-b";
    player.gold = 1000;
    expect(await replies(socket, "playerUpdate", () => socket.emit("moveItem", buy))).toBe(false);
    delete world.npcs["shop-b"];
    expect(await replies(socket, "playerUpdate", () => socket.emit("moveItem", buy))).toBe(false);
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
    expect((await info)[0].type).toBe("system");
    expect(player.spawn).toMatchObject({
      x: 11,
      y: 22,
      roomName: player.roomName,
    });
  });

  it("refuses from far away, without a home, or without a target", async () => {
    const { socket, world, player } = await login();
    const before = player.spawn;
    const setSpawn = () => socket.emit("setSpawn", { x: 1, y: 2, roomName: "x" });
    const keeper = placeKeeper(world, player, "home-far", FAR);
    player.state.targetNpcId = "home-far";
    expect(await replies(socket, "message", setSpawn)).toBe(false);

    keeper.x = player.x;
    keeper.keeperData.home = undefined;
    expect(await replies(socket, "message", setSpawn)).toBe(false);

    player.state.targetNpcId = null;
    expect(await replies(socket, "message", setSpawn)).toBe(false);
    expect(player.spawn).toEqual(before);
  });
});
