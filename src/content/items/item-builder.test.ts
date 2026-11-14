import { describe, expect, it } from "vitest";
import { cloneJson, type Dice } from "../random";
import { ItemBuilder, rarityForSlots } from "./item-builder";
import { ITEM_CATALOG } from "./item-catalog";
import { getSetBonus, itemSetList } from "./item-sets";
import { itemEffects, scaleMod } from "./mods";
import { stackableItems } from "./stackable";

const dice: Dice = { random: () => 0.5, newId: () => "id" };
const build = (ref: Parameters<typeof ItemBuilder.buildItem>[1], amount?: number) =>
  ItemBuilder.buildItem(dice, ref, amount);

describe("buildItem", () => {
  it("builds a family tier with blank slots, its count setting its rarity", () => {
    expect(build("clothCap")).toMatchObject({ rarity: "common", mods: undefined });
    expect(build({ key: "clothCap", slots: 2 })).toMatchObject({
      rarity: "magic",
      mods: [null, null],
    });
    expect(build({ key: "clothCap", slots: 4 })?.rarity).toBe("rare");
  });

  it("caps slots at four", () => {
    expect(build({ key: "sword", slots: 9 })?.mods).toHaveLength(4);
  });

  it("gives uniques and set pieces every slot and their fixed mod on top", () => {
    const whistler = build("darkWhistler")!;
    expect(whistler).toMatchObject({ rarity: "unique", fixedMod: "venomous" });
    expect(whistler.mods).toEqual([null, null, null, null]);
    expect(whistler.triggers).toEqual(scaleMod("venomous", 1).triggers);
    expect(build("tizona")).toMatchObject({ rarity: "set", setName: "cids", fixedMod: "precise" });
  });

  it("never gives bags, spells or stackables slots", () => {
    expect(build({ key: "smallPouch", slots: 3 } as never)).toMatchObject({ rarity: "rare" });
    expect(build("smallPouch")?.mods).toBeUndefined();
    expect(build("raesBasket")?.mods).toBeUndefined();
    expect(build("fireball")?.mods).toBeUndefined();
    expect(build("smallHpPotion", 5)).toMatchObject({ amount: 5, mods: undefined });
  });

  it("scales a family's stats by tier, and the same for every item on that tier", () => {
    const cap = ITEM_CATALOG.clothCap.stats.defense;
    expect(ITEM_CATALOG.wizardCap.stats.defense).toBe(cap * 3);
    expect(ITEM_CATALOG.wizardCap.level).toBe(17);
  });

  it("lets a higher tier stackable or spell take only its name, look and stats from its base", () => {
    expect(ITEM_CATALOG.fireball2).toMatchObject({ name: "Fireball", texture: "scroll-red" });
    for (const [key, own] of Object.entries(stackableItems).flatMap(([, items]) =>
      Object.entries(items as Record<string, { tint?: string }>),
    )) {
      expect(ITEM_CATALOG[key].tint, key).toBe(own.tint);
    }
  });

  it("is null for keys that don't exist", () => {
    expect(build("nope")).toBeNull();
  });

  it("doesn't change the catalog", () => {
    const before = cloneJson(ITEM_CATALOG.darkWhistler);
    build("darkWhistler");
    expect(ITEM_CATALOG.darkWhistler).toEqual(before);
  });
});

describe("rarityForSlots", () => {
  it("is common, then magic, then rare", () => {
    expect([0, 1, 2, 3, 4].map(rarityForSlots)).toEqual([
      "common",
      "magic",
      "magic",
      "rare",
      "rare",
    ]);
  });
});

describe("mods", () => {
  it("give an item its look: a fixed mod's effect, then each filled slot's", () => {
    expect(itemEffects({ fixedMod: "fiery", mods: [null, "frozen", "sharp"] })).toEqual([
      "fire",
      "water",
    ]);
    expect(itemEffects({ fixedMod: "venomous" })).toEqual([]);
  });

  it("multiply by tier, the same as buffs by level", () => {
    expect(scaleMod("sharp", 3).stats).toEqual({ minDamage: 3, maxDamage: 6 });
    expect(scaleMod("venomous", 2).triggers[0]).toMatchObject({ level: 2, chance: 4 });
  });
});

describe("sets", () => {
  it("keep every piece in the set's tier", () => {
    for (const [setName, set] of Object.entries(itemSetList)) {
      for (const key of Object.keys(set.pieces)) {
        expect(ITEM_CATALOG[key], key).toMatchObject({ setName, tier: set.tier, rarity: "set" });
      }
    }
  });

  it("add their bonus mods at the set's tier", () => {
    expect(getSetBonus("cids")).toMatchObject({
      name: "El Cid's Swords",
      pieces: 2,
      stats: { critChance: 4, blockChance: 6 },
    });
    expect(getSetBonus("nope")).toBeUndefined();
  });
});

describe("spells", () => {
  it("all take time to cast", () => {
    const spells = Object.values(ITEM_CATALOG).filter((item) => item.type === "spell");
    expect(spells.filter((spell) => !spell.stats.castTime).map((spell) => spell.key)).toEqual([]);
  });
});
