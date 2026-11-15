// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/content";
import { MAX_INVENTORY_ITEMS } from "@/rules/inventory";
import { createServerDice } from "../server-dice";
import { once, settle, startTestServer, TEST_SEED, type TestServer } from "./test-server";

/** Inventory flows over a real socket: equip, bags, stacking, drop and consume. */
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

  it("a grab with a full inventory goes into the first bag with room", async () => {
    const { socket } = await login("warrior");
    const hero = server.world.players[socket.id as string];
    const filler = () => build("clothRobe");
    const fullBag = { ...build("smallPouch"), items: [filler()] };
    (fullBag as Anything).space = 1;
    const openBag = { ...build("smallPouch"), items: [filler(), null] };
    (openBag as Anything).space = 2;
    hero.inventory = [fullBag, openBag, ...Array.from({ length: MAX_INVENTORY_ITEMS - 2 }, filler)];
    const item = filler();
    const loot = {
      id: "overflow-loot",
      roomName: hero.roomName,
      x: hero.x,
      y: hero.y,
      item,
      dropTime: server.world.now(),
    };
    server.world.loots[loot.id] = loot as Anything;

    const grabbed = once(socket, "lootGrabbed");
    socket.emit("grabLoot", { lootId: loot.id, direction: "left" });
    const [result] = await grabbed;

    expect(result.player.inventory[1].items[1].id).toBe(item.id);
    expect(server.world.loots[loot.id]).toBeUndefined();
  });

  it("refuses an item in the wrong equipment slot", async () => {
    const { socket, player } = await login("warrior");
    player.inventory = [player.equipment.armor];
    player.equipment.armor = null;
    socket.emit("moveItem", {
      from: { location: "inventory", slot: 0 },
      to: { location: "equipment", slot: "handRight" },
    });
    await settle(socket);
    expect(player.inventory[0].base).toBe("robe");
    expect(player.equipment.handRight.base).toBe("axe");
  });

  it("swaps two inventory slots", async () => {
    const { socket, player } = await login("rogue");
    const a = build("clothRobe");
    const b = build("clothPants");
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
    const bag = build("smallPouch");
    bag.items = [null, null, null, null];
    const pants = build("clothPants");
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
    const { socket, player, world } = await login("warrior");
    const bag = build("smallPouch");
    const other = build("largePouch");
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
    expect(world.players[socket.id as string].inventory[1].id).toBe(other.id);
  });

  it("answers dropping on a full bag with an error", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("smallPouch");
    bag.items = Array.from({ length: bag.space as number }, () => build("clothPants"));
    player.inventory = [bag, build("clothRobe")];
    const message = once(socket, "message");
    socket.emit("moveItem", {
      from: { location: "inventory", slot: 1 },
      to: { location: "bag", bagId: bag.id },
    });
    expect((await message)[0]).toMatchObject({
      type: "error",
      message: "Bag is full.",
    });
  });

  it("drops part of a stack and spawns it as loot", async () => {
    const { socket, player, world } = await login("warrior");
    player.inventory = [build("smallHpPotion", 5)];
    const before = Object.keys(world.loots).length;
    const update = await emitAndWait(socket, "dropItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
      amount: 2,
    });
    expect(update.inventory[0].amount).toBe(3);
    const loots = Object.values(world.loots) as Anything[];
    expect(loots.length).toBe(before + 1);
    expect(loots.some((l) => l.item?.id === "smallHpPotion" && l.item?.amount === 2)).toBe(true);
  });

  it("drops a whole stack when the amount covers it", async () => {
    const { socket, player } = await login("warrior");
    player.inventory = [build("smallHpPotion", 2)];
    const update = await emitAndWait(socket, "dropItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
      amount: 10,
    });
    expect(update.inventory[0]).toBeFalsy();
  });

  it("refuses to drop a bag with items inside", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("smallPouch");
    bag.items = [build("clothPants"), null];
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
    player.inventory = [build("smallHpPotion", 3)];
    player.stats.hp = 1;
    const update = await emitAndWait(socket, "consumeItem", {
      location: "inventory",
      item: { id: "smallHpPotion" },
    });
    expect(update.inventory[0].amount).toBe(2);
    expect(player.stats.hp).toBeGreaterThan(1);
    expect(server.clock.now() - player.state.lastPotion).toBeLessThan(2000);
  });

  it("uses up the last potion in a bag", async () => {
    const { socket, player } = await login("warrior");
    const bag = build("smallPouch");
    bag.items = [build("smallMpPotion", 1)];
    player.inventory = [bag];
    const update = await emitAndWait(socket, "consumeItem", {
      location: "bag",
      item: { id: "smallMpPotion" },
    });
    expect(update.inventory[0].items[0]).toBeFalsy();
  });
});
