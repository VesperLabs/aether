import { describe, expect, it } from "vitest";
import type { Dice } from "../random";
import { AFFIXES } from "./item-affixes";
import { ItemBuilder } from "./item-builder";
import { itemList } from "./item-scaling";

function seededDice(seed: number): Dice {
  let s = seed;
  return {
    random: () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    },
    newId: () => `id-${s}`,
  };
}

const affixByName = new Map(AFFIXES.map((a) => [a.name as string, a]));

describe("buildItem", () => {
  it("keeps a common item's own level and rarity, with no affixes", () => {
    const sword = ItemBuilder.buildItem(seededDice(1), "weapon", "common", "sword");
    expect(sword).toMatchObject({ key: "sword", rarity: "common", level: 1 });
    expect(sword?.affixes).toBeUndefined();
  });

  it("gives magic items one or two affixes, at most one of each kind, named after them", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const item = ItemBuilder.buildItem(seededDice(seed), "helmet", "magic", "clothCap");
      expect(item?.rarity).toBe("magic");
      expect(item?.key).toBe("clothCap");
      const affixes = (item?.affixes ?? []).map((name) => affixByName.get(name)!);
      expect(affixes.length).toBeGreaterThanOrEqual(1);
      expect(affixes.length).toBeLessThanOrEqual(2);
      expect(affixes.filter((a) => a.kind === "prefix").length).toBeLessThanOrEqual(1);
      expect(affixes.filter((a) => a.kind === "suffix").length).toBeLessThanOrEqual(1);
      for (const affix of affixes) expect(item?.name).toContain(affix.name);
    }
  });

  it("never gives a rare item two affixes on the same stat", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const item = ItemBuilder.buildItem(seededDice(seed), "weapon", "rare", "sword");
      const stats = (item?.affixes ?? []).flatMap((name) =>
        Object.keys(affixByName.get(name)!.stats),
      );
      expect(new Set(stats).size).toBe(stats.length);
      expect(item?.affixes?.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("only rolls affixes the item's own level allows", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const item = ItemBuilder.buildItem(seededDice(seed), "weapon", "rare", "sword");
      for (const name of item?.affixes ?? []) {
        expect(affixByName.get(name)!.level).toBeLessThanOrEqual(item!.level);
      }
    }
  });

  it("rolls stronger affixes on higher level items", () => {
    const strengthOn = (key: string) => {
      let best = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const item = ItemBuilder.buildItem(seededDice(seed), "armor", "magic", key);
        if (item?.affixes?.includes("of Strength")) best = Math.max(best, item.stats!.strength);
      }
      return best;
    };
    const low = Object.entries(itemList.armor.common).find(([, d]) => d.level === 1)![0];
    const high = Object.entries(itemList.armor.common).find(([, d]) => d.level === 17)![0];
    expect(strengthOn(high)).toBeGreaterThan(strengthOn(low));
  });

  it("builds bags and spells asked for as magic as they are written", () => {
    expect(ItemBuilder.buildItem(seededDice(1), "spell", "magic", "fireball")).toMatchObject({
      rarity: "common",
      level: 1,
    });
  });

  it("gives spells a rank from their level", () => {
    expect(itemList.spell.common.fireball3).toMatchObject({ rank: 3, level: 17 });
  });
});
