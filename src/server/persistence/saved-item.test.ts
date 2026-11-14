import { describe, expect, it } from "vitest";
import { ItemBuilder, type Dice, type Item } from "@/content";
import { hydrateItem, hydrateSlots, toSavedItem, toSavedSlots } from "./saved-item";

let nextId = 0;
const dice: Dice = { random: () => 0.5, newId: () => `id-${nextId++}` };
const build = (ref: Parameters<typeof ItemBuilder.buildItem>[1], amount?: number) =>
  ItemBuilder.buildItem(dice, ref, amount) as Item;

/** Saved and loaded the way Mongo would: through JSON. */
const roundTrip = (item: Item) => hydrateItem(dice, JSON.parse(JSON.stringify(toSavedItem(item))));

describe("saved items", () => {
  it("saves gear as its id, key and slotted mods, and loads it back whole", () => {
    const blank = build({ key: "sword", slots: 3 });
    const sword = ItemBuilder.withMods(blank, ["sharp", null, "fiery"]);
    expect(sword.stats?.maxFireDamage).toBeGreaterThan(blank.stats?.maxFireDamage ?? 0);
    expect(toSavedItem(sword)).toEqual({
      id: sword.id,
      key: "sword",
      mods: ["sharp", null, "fiery"],
    });
    expect(roundTrip(sword)).toEqual(sword);
  });

  it("saves a stackable as its key and amount", () => {
    const potion = build("smallHpPotion", 5);
    expect(toSavedItem(potion)).toEqual({ key: "smallHpPotion", amount: 5 });
    expect(roundTrip(potion)).toEqual(potion);
  });

  it("round-trips a unique, a spell and a bag with items in it", () => {
    const bag = build("smallPouch");
    bag.items = [build("dagger"), null, build("redApple", 3), null];
    for (const item of [build("darkWhistler"), build("fireball"), bag]) {
      expect(roundTrip(item)).toEqual(item);
    }
  });

  it("drops an item content no longer has, and empties slots whose mod is gone or won't fit", () => {
    expect(hydrateItem(dice, { id: "x", key: "noSuchItem" })).toBeNull();
    expect(hydrateItem(dice, { nonsense: true })).toBeNull();
    const loaded = hydrateItem(dice, {
      id: "x",
      key: "sword",
      mods: ["sharp", "noSuchMod", "sturdy"],
    });
    expect(loaded?.mods).toEqual(["sharp", null, null]);
  });

  it("keeps empty slots in slot records and lists", () => {
    const equipment = { handRight: build("dagger"), helmet: null };
    const saved = toSavedSlots(equipment);
    expect(saved).toEqual({
      handRight: { id: equipment.handRight.id, key: "dagger" },
      helmet: null,
    });
    expect(hydrateSlots(dice, saved)).toEqual(equipment);
    expect(hydrateSlots(dice, [null, { key: "redApple", amount: 2 }])).toEqual([
      null,
      build("redApple", 2),
    ]);
  });
});
