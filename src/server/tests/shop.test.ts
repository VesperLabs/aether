// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/content";
import { createServerDice } from "../server-dice";
import { once, startTestServer, TEST_SEED, type TestServer } from "./test-server";

/** The shop over a real socket: buying, selling and daily stock. */
let server: TestServer;

type Anything = any;

const login = (charClass?: string) => server.login(charClass);

/** Real dice: items in an inventory need ids of their own, apart from the server's. */
const dice = createServerDice(TEST_SEED + 1);
const build = (key: string, amount?: number) => ItemBuilder.buildItem(dice, key, amount)!;
const emitAndWait = async (socket: Socket, event: string, payload: Anything) => {
  const update = once(socket, "playerUpdate");
  socket.emit(event as never, payload as never);
  return (await update)[0];
};

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("shop over the socket", () => {
  function stockShop(world: Anything, player: Anything, items: Anything[]) {
    const shop = items.map((item) => ({
      item: { ...item, cost: item.cost * 4 },
      stock: 10,
    }));
    world.npcs["test-shop"] = {
      id: "test-shop",
      getQuests: () => [],
      x: player.x,
      y: player.y,
      room: { name: player.roomName },
      services: { shop },
      talkingIds: [],
    };
    player.state.targetNpcId = "test-shop";
    return shop;
  }

  afterAll(() => {
    const world = server.world;
    delete world.npcs["test-shop"];
  });

  it("buys an item for its price and removes the shop inflation", async () => {
    const { socket, player, world } = await login("warrior");
    const pants = build("clothPants");
    stockShop(world, player, [pants]);
    player.gold = 100;
    const update = await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0 },
      to: { location: "inventory", slot: 0 },
    });
    expect(update.inventory[0].base).toBe("pants");
    expect(update.inventory[0].cost).toBe(pants.cost as number);
    expect(update.gold).toBe(100 - (pants.cost as number) * 4);
  });

  it("sells gear once: the shelf is empty after it is bought", async () => {
    const { socket, player, world } = await login("warrior");
    const [slot] = stockShop(world, player, [build("clothPants")]);
    slot.stock = 1;
    player.gold = 1000;
    await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0 },
      to: { location: "inventory", slot: 0 },
    });
    expect(slot.stock).toBe(0);
    expect(slot.item).toBeNull();
  });

  it("refuses more of a stackable than is left today, and counts down what sells", async () => {
    const { socket, player, world } = await login("warrior");
    const [slot] = stockShop(world, player, [build("smallHpPotion", 1)]);
    slot.stock = 3;
    player.inventory = [];
    player.gold = 1000;
    const message = once(socket, "message");
    socket.emit("moveItem", {
      from: { location: "shop", slot: 0, amount: 5 },
      to: { location: "inventory", slot: 0 },
    });
    expect((await message)[0]).toMatchObject({ type: "error", message: "Only 3 left today" });
    await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0, amount: 2 },
      to: { location: "inventory", slot: 0 },
    });
    expect(slot.stock).toBe(1);
  });

  it("cannot buy without enough gold", async () => {
    const { socket, player, world } = await login("warrior");
    stockShop(world, player, [build("clothPants")]);
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
    const { socket, player, world } = await login("warrior");
    const potion = build("smallHpPotion", 1);
    stockShop(world, player, [potion]);
    player.inventory = [build("smallHpPotion", 2)];
    player.gold = 1000;
    const update = await emitAndWait(socket, "moveItem", {
      from: { location: "shop", slot: 0, amount: 3 },
      to: { location: "inventory", slot: 4 },
    });
    expect(update.inventory[0].amount).toBe(5);
    expect(update.inventory[4]).toBeFalsy();
    expect(update.gold).toBe(1000 - (potion.cost as number) * 4 * 3);
  });

  it("sells part of a stack and an equipped item for gold", async () => {
    const { socket, player, world } = await login("warrior");
    stockShop(world, player, [build("clothPants")]);
    const potion = build("smallHpPotion", 5);
    player.inventory = [potion];
    player.gold = 0;
    const sold = await emitAndWait(socket, "moveItem", {
      from: { location: "inventory", slot: 0, amount: 2 },
      to: { location: "shop", slot: 0 },
    });
    expect(sold.inventory[0].amount).toBe(3);
    expect(sold.gold).toBe(2 * (potion.cost as number));

    const weaponCost = player.equipment.handRight.cost;
    const soldWeapon = await emitAndWait(socket, "moveItem", {
      from: { location: "equipment", slot: "handRight" },
      to: { location: "shop", slot: 0 },
    });
    expect(soldWeapon.equipment.handRight).toBeFalsy();
    expect(soldWeapon.gold).toBe(2 * (potion.cost as number) + weaponCost);
  });

  it("credits gold only for what was actually removed", async () => {
    const { socket, player, world } = await login("warrior");
    stockShop(world, player, [build("clothPants")]);
    const potion = build("smallHpPotion", 5);
    const cost = potion.cost as number;
    const bag = build("smallPouch");
    bag.items = [build("smallHpPotion", 3)];
    player.inventory = [potion, bag];
    player.abilities = {
      ...player.abilities,
      a1: build("smallHpPotion", 3),
    };
    player.gold = 0;
    const sell = (from: Anything) =>
      emitAndWait(socket, "moveItem", {
        from,
        to: { location: "shop", slot: 0 },
      });
    const invFrom = { location: "inventory", slot: 0 };
    const bagFrom = { location: "bag", bagId: bag.id, slot: 0 };
    const abFrom = { location: "abilities", slot: "a1" };

    // Refused sells change nothing; the sentinel sell afterwards proves no gold was credited.
    for (const from of [
      { ...invFrom, amount: 6 },
      { ...invFrom, amount: 0 },
      { ...bagFrom, amount: 4 },
      { ...abFrom, amount: 4 },
    ]) {
      socket.emit("moveItem", { from, to: { location: "shop", slot: 0 } });
    }
    const partial = await sell({ ...invFrom, amount: 2 });
    expect(partial.gold).toBe(2 * cost);
    expect(partial.inventory[0].amount).toBe(3);

    const exact = await sell({ ...invFrom, amount: 3 });
    expect(exact.gold).toBe(5 * cost);
    expect(exact.inventory[0]).toBeFalsy();

    const bagPart = await sell({ ...bagFrom, amount: 2 });
    expect(bagPart.gold).toBe(7 * cost);
    const bagAll = await sell({ ...bagFrom, amount: 1 });
    expect(bagAll.gold).toBe(8 * cost);

    const abPart = await sell({ ...abFrom, amount: 2 });
    expect(abPart.gold).toBe(10 * cost);
    expect(abPart.abilities.a1.amount).toBe(1);
    const abAll = await sell({ ...abFrom, amount: 1 });
    expect(abAll.gold).toBe(11 * cost);
    expect(abAll.abilities.a1).toBeFalsy();
  });
});
