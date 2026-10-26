// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "../phaser";
import { ItemBuilder } from "@/shared/content";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Inventory flows over a real socket: equip, bags, stacking, drop, consume and the shop. */
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
  await heroInit;
  const scene = (gameServer.game.scene as Anything).getScene("ServerScene");
  const player = scene.players[socket.id as string];
  return { socket, scene, player };
}

const build = (...args: (string | number)[]) => ItemBuilder.buildItem(...(args as string[]))!;
const emitAndWait = async (socket: Socket, event: string, payload: Anything) => {
  const update = once(socket, "playerUpdate");
  socket.emit(event as never, payload as never);
  return (await update)[0];
};

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

describe("inventory over the socket", () => {
  it("equips an item from the inventory and unequips it again", async () => {
    const { socket, player } = await login("warrior");
    const armorId = player.equipment.armor.id;
    const unequipped = await emitAndWait(socket, "moveItem", {
      from: { location: "equipment", slot: "armor" },
      to: { location: "inventory", slot: 2 },
    });
    expect(unequipped.equipment.armor).toBeFalsy();
    expect(unequipped.inventory[2].id).toBe(armorId);

    const equipped = await emitAndWait(socket, "moveItem", {
      from: { location: "inventory", slot: 2 },
      to: { location: "equipment", slot: "armor" },
    });
    expect(equipped.equipment.armor.id).toBe(armorId);
    expect(equipped.inventory[2]).toBeFalsy();
  });

  it("refuses an item in the wrong equipment slot", async () => {
    const { socket, player } = await login("warrior");
    player.inventory = [player.equipment.armor];
    player.equipment.armor = null;
    socket.emit("moveItem", {
      from: { location: "inventory", slot: 0 },
      to: { location: "equipment", slot: "handLeft" },
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(player.inventory[0].base).toBe("robe");
    expect(player.equipment.handLeft.base).toBe("axe");
  });

  it("swaps two inventory slots", async () => {
    const { socket, player } = await login("rogue");
    const a = build("armor", "common", "clothRobe");
    const b = build("pants", "common", "clothPants");
    player.inventory = [a, b];
    const update = await emitAndWait(socket, "moveItem", {
      from: { location: "inventory", slot: 0 },
      to: { location: "inventory", slot: 1 },
    });
    expect(update.inventory[0].id).toBe(b.id);
    expect(update.inventory[1].id).toBe(a.id);
  });

  it("moves an item into a bag and back out", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("bag", "rare", "smallPouch");
    bag.items = [null, null, null, null];
    const pants = build("pants", "common", "clothPants");
    player.inventory = [bag, pants];

    const inBag = await emitAndWait(socket, "moveItem", {
      from: { location: "inventory", slot: 1 },
      to: { location: "bag", bagId: bag.id, slot: 2 },
    });
    expect(inBag.inventory[1]).toBeFalsy();
    expect(inBag.inventory[0].items[2].id).toBe(pants.id);

    const out = await emitAndWait(socket, "moveItem", {
      from: { location: "bag", bagId: bag.id, slot: 2 },
      to: { location: "inventory", slot: 5 },
    });
    expect(out.inventory[5].id).toBe(pants.id);
    expect(out.inventory[0].items[2]).toBeFalsy();
  });

  it("does not put a bag inside a bag", async () => {
    const { socket, player, scene } = await login("warrior");
    const bag = build("bag", "rare", "smallPouch");
    const other = build("bag", "rare", "largePouch");
    bag.items = [null, null];
    other.items = [null, null];
    player.inventory = [bag, other];
    const message = once(socket, "message");
    socket.emit("moveItem", {
      from: { location: "inventory", slot: 1 },
      to: { location: "bag", bagId: bag.id, slot: 0 },
    });
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Cannot put bags in bags.",
    });
    expect(scene.players[socket.id as string].inventory[1].id).toBe(other.id);
  });

  it("answers dropping on a full bag with an error", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("bag", "rare", "smallPouch");
    bag.items = [build("pants", "common", "clothPants")];
    player.inventory = [bag, build("armor", "common", "clothRobe")];
    const message = once(socket, "message");
    socket.emit("moveItem", {
      from: { location: "inventory", slot: 1 },
      to: { location: "bag", bagId: bag.id },
    });
    expect((await message)[0]).toMatchObject({ type: "error", message: "Bag is full." });
  });

  it("drops part of a stack and spawns it as loot", async () => {
    const { socket, player, scene } = await login("warrior");
    player.inventory = [build("stackable", "common", "smallHpPotion", 5)];
    const before = Object.keys(scene.loots).length;
    const update = await emitAndWait(socket, "dropItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
      amount: 2,
    });
    expect(update.inventory[0].amount).toBe(3);
    const loots = Object.values(scene.loots) as Anything[];
    expect(loots.length).toBe(before + 1);
    expect(loots.some((l) => l.item?.id === "smallHpPotion" && l.item?.amount === 2)).toBe(true);
  });

  it("drops a whole stack when the amount covers it", async () => {
    const { socket, player } = await login("warrior");
    player.inventory = [build("stackable", "common", "smallHpPotion", 2)];
    const update = await emitAndWait(socket, "dropItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
      amount: 10,
    });
    expect(update.inventory[0]).toBeFalsy();
  });

  it("refuses to drop a bag with items inside", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("bag", "rare", "smallPouch");
    bag.items = [build("pants", "common", "clothPants"), null];
    player.inventory = [bag];
    const message = once(socket, "message");
    socket.emit("dropItem", {
      location: "inventory",
      item: { id: bag.id, base: "bag", items: bag.items },
    });
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Cannot drop a bag with items inside of it.",
    });
    expect(player.inventory[0].id).toBe(bag.id);
  });

  it("consumes a potion, heals and starts the cooldown", async () => {
    const { socket, player } = await login("warrior");
    player.inventory = [build("stackable", "common", "smallHpPotion", 3)];
    player.stats.hp = 1;
    const update = await emitAndWait(socket, "consumeItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
    });
    expect(update.inventory[0].amount).toBe(2);
    expect(player.stats.hp).toBeGreaterThan(1);
    expect(Date.now() - player.state.lastPotion).toBeLessThan(2000);
  });

  it("uses up the last potion in a bag", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("bag", "rare", "smallPouch");
    bag.items = [build("stackable", "common", "smallMpPotion", 1)];
    player.inventory = [bag];
    const update = await emitAndWait(socket, "consumeItem", {
      location: "bag",
      item: { id: "smallMpPotion" },
    });
    expect(update.inventory[0].items[0]).toBeFalsy();
  });
});

describe("shop over the socket", () => {
  function stockShop(scene: Anything, player: Anything, items: Anything[]) {
    const shop = items.map((item) => ({ item: { ...item, cost: item.cost * 4 }, stock: 10 }));
    scene.npcs["test-shop"] = { keeperData: { shop } };
    player.state.targetNpcId = "test-shop";
  }

  afterAll(() => {
    const scene = (gameServer.game.scene as Anything).getScene("ServerScene");
    delete scene.npcs["test-shop"];
  });

  it("buys an item for its price and removes the shop inflation", async () => {
    const { socket, player, scene } = await login("warrior");
    const pants = build("pants", "common", "clothPants");
    stockShop(scene, player, [pants]);
    player.gold = 100;
    const update = await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0 },
      to: { location: "inventory", slot: 0 },
    });
    expect(update.inventory[0].base).toBe("pants");
    expect(update.inventory[0].cost).toBe(pants.cost);
    expect(update.gold).toBe(100 - pants.cost * 4);
  });

  it("cannot buy without enough gold", async () => {
    const { socket, player, scene } = await login("warrior");
    stockShop(scene, player, [build("pants", "common", "clothPants")]);
    player.gold = 0;
    const message = once(socket, "message");
    socket.emit("moveItem", {
      from: { location: "shop", slot: 0 },
      to: { location: "inventory", slot: 0 },
    });
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "You cannot afford this item",
    });
    expect(player.inventory[0]).toBeFalsy();
  });

  it("adds a bought stackable to the stack the player already owns", async () => {
    const { socket, player, scene } = await login("warrior");
    const potion = build("stackable", "common", "smallHpPotion", 1);
    stockShop(scene, player, [potion]);
    player.inventory = [build("stackable", "common", "smallHpPotion", 2)];
    player.gold = 1000;
    const update = await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0, amount: 3 },
      to: { location: "inventory", slot: 4 },
    });
    expect(update.inventory[0].amount).toBe(5);
    expect(update.inventory[4]).toBeFalsy();
    expect(update.gold).toBe(1000 - potion.cost * 4 * 3);
  });

  it("sells part of a stack and an equipped item for gold", async () => {
    const { socket, player, scene } = await login("warrior");
    stockShop(scene, player, [build("pants", "common", "clothPants")]);
    const potion = build("stackable", "common", "smallHpPotion", 5);
    player.inventory = [potion];
    player.gold = 0;
    const sold = await emitAndWait(socket, "moveItem", {
      from: { location: "inventory", slot: 0, amount: 2 },
      to: { location: "shop", slot: 0 },
    });
    expect(sold.inventory[0].amount).toBe(3);
    expect(sold.gold).toBe(2 * potion.cost);

    const weaponCost = player.equipment.handLeft.cost;
    const soldWeapon = await emitAndWait(socket, "moveItem", {
      from: { location: "equipment", slot: "handLeft" },
      to: { location: "shop", slot: 0 },
    });
    expect(soldWeapon.equipment.handLeft).toBeFalsy();
    expect(soldWeapon.gold).toBe(2 * potion.cost + weaponCost);
  });
});
