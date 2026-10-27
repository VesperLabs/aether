import { describe, expect, it } from "vitest";
import { describeItem } from ".";

describe("describeItem", () => {
  it("formats stats, percent stats and damage ranges", () => {
    const d = describeItem({
      name: "Sword",
      base: "short-sword",
      stats: { minAttackDamage: 2, maxAttackDamage: 5, hp: 10, spCost: 3 },
      percentStats: { vitality: 5 },
    });
    expect(d.kind).toBe("short sword");
    expect(d.stats).toEqual([
      { label: "AttackDamage", value: "2 ↔ 5" },
      { label: "hp", value: "+10" },
      { label: "vitality", value: "5%" },
    ]);
    expect(d.resourceCosts).toEqual([{ resource: "sp", amount: 3 }]);
  });

  it("joins wiki [min, max] ranges", () => {
    const d = describeItem({ percentStats: { vitality: [5, 10] } });
    expect(d.stats).toEqual([{ label: "vitality", value: "5% ↔ 10%" }]);
  });

  it("scales buff stats and duration by level", () => {
    const d = describeItem({ buffs: { evasion: 2 } });
    expect(d.buffs).toEqual([
      {
        name: "evasion",
        level: 2,
        stats: [
          { label: "duration", value: "60s" },
          { label: "dodgeChance", value: "10%" },
        ],
      },
    ]);
  });

  it("describes triggers", () => {
    const d = describeItem({
      triggers: [{ event: "onHurt", type: "buff", name: "evasion", level: 3, chance: 4 }],
    });
    expect(d.triggers).toEqual([{ name: "evasion", level: 3, chancePercent: 25, when: "on hurt" }]);
  });

  it("treats requirements as met and sets as active without a player", () => {
    const d = describeItem({ requirements: { strength: 10 }, setName: "chets" });
    expect(d.requirements).toEqual([{ label: "strength", value: "10", met: true }]);
    expect(d.set).toMatchObject({ name: "Chet's Leisureware", pieces: 3, active: true });
  });

  it("checks requirements and the set against a player", () => {
    const player = { stats: { strength: 5 }, state: { activeSets: [] } };
    const d = describeItem({ requirements: { strength: 10 }, setName: "chets" }, player);
    expect(d.requirements[0].met).toBe(false);
    expect(d.set?.active).toBe(false);
  });

  it("knows the double-click action, spell level and description", () => {
    expect(describeItem({ base: "food" }).action).toBe("consume");
    expect(describeItem({ base: "bag" }).action).toBe("open");
    expect(describeItem({ base: "short-sword" }).action).toBeUndefined();
    const spell = describeItem({ type: "spell", base: "flame-slash", ilvl: 2 });
    expect(spell).toMatchObject({ kind: "spell", level: 2 });
    expect(spell.description).toMatch(/fire damage/);
  });

  it("multiplies cost by amount and counts bag space", () => {
    const d = describeItem({ cost: 10, amount: 3, space: 4, items: [{}, null, {}] });
    expect(d).toMatchObject({ cost: 30, amount: 3, space: { used: 2, total: 4 } });
  });
});
