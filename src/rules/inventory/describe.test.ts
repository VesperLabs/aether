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
    expect(describeItem({ base: "shortBow" }).kind).toBe("short bow");
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

  it("scales buff stats by level, as the buff itself does, but not its duration", () => {
    const d = describeItem({ buffs: { evasion: 2 } });
    expect(d.buffs).toEqual([
      {
        name: "evasion",
        level: 2,
        stats: [
          { label: "duration", value: "30s" },
          { label: "dodgeChance", value: "10%" },
        ],
      },
    ]);
  });

  it("shows a spell's own buff as its effects, at its rank, with no note", () => {
    const d = describeItem({ type: "spell", base: "haste", buffs: { haste: 3 } });
    expect(d.buffs).toEqual([]);
    expect(d.effects).toContainEqual({ label: "walkSpeed", value: "30" });
  });

  it("keeps a buff a spell inflicts under its own name", () => {
    const d = describeItem({ type: "spell", base: "quake", buffs: { stun: 1 } });
    expect(d.buffs.map((buff) => buff.name)).toEqual(["stun"]);
  });

  it("marks a card's flat stats and triggers as multiplied by tier, but not its percents", () => {
    expect(describeItem({ mod: "strong" }).mods.added.stats).toEqual([
      { label: "strength", value: "2", note: "(×tier)" },
    ]);
    expect(describeItem({ mod: "sanguine" }).mods.added.stats).toEqual([
      { label: "maxHp", value: "12%" },
    ]);
    expect(describeItem({ mod: "venomous" }).mods.added.triggers[0]?.perTier).toBe(true);
  });

  it("marks only the buff stats that scale by level as multiplied by a card's tier", () => {
    expect(describeItem({ mod: "enduring" }).mods.added.triggers[0]?.stats).toEqual([
      { label: "duration", value: "30s" },
      { label: "maxHp", value: "15", note: "(+15/tier)" },
    ]);
    const slow = describeItem({ mod: "slowing" }).mods.added.triggers[0]?.stats;
    expect(slow?.filter((line) => line.note)).toEqual([
      { label: "duration", value: "3s", note: "(+0.5s/tier)" },
    ]);
  });

  it("shows a mod's stat under mods, out of the base stats, scaled by tier", () => {
    const d = describeItem({ tier: 2, stats: { defense: 4, critChance: 4 }, fixedMod: "precise" });
    expect(d.stats).toEqual([{ label: "defense", value: "4" }]);
    expect(d.mods.fixed?.stats).toEqual([{ label: "critChance", value: "4%" }]);
    expect(d.mods.added.stats).toEqual([]);
  });

  it("describes triggers as mods", () => {
    const d = describeItem({
      triggers: [{ event: "onHurt", type: "buff", name: "evasion", level: 3, chance: 4 }],
    });
    expect(d.mods.added.triggers).toMatchObject([
      { name: "evasion", level: 3, chancePercent: 25, when: "hurt" },
    ]);
    expect(d.mods.added.triggers[0].stats.length).toBeGreaterThan(0);
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
    const spell = describeItem({ type: "spell", base: "flame-slash", rank: 2 });
    expect(spell).toMatchObject({ kind: "spell", level: 2 });
    expect(spell.description).toMatch(/fire damage/);
  });

  it("multiplies cost by amount and counts bag space", () => {
    const d = describeItem({ cost: 10, amount: 3, space: 4, items: [{}, null, {}] });
    expect(d).toMatchObject({ cost: 30, amount: 3, space: { used: 2, total: 4 } });
  });
});

describe("a card's gear", () => {
  it("shows copies of a trigger as one line, their chances added", () => {
    const venom = { event: "onAttackHit", type: "debuff", name: "poison", level: 2, chance: 20 };
    const d = describeItem({ triggers: [venom, venom] } as never);
    expect(d.mods.added.triggers).toMatchObject([{ name: "poison", chancePercent: 10 }]);
  });

  it("splits a weapon's mods into its own swings' and the global ones", () => {
    const venom = { event: "onAttackHit", type: "debuff", name: "poison", level: 1, chance: 20 };
    const sword = { type: "weapon", tier: 1, mods: ["precise", "arcane"], triggers: [venom] };
    const { added } = describeItem(sword as never).mods;
    expect(added.stats).toEqual([{ label: "critChance", value: "2%" }]);
    expect(added.triggers.map((t) => t.name)).toEqual(["poison"]);
    expect(added.global).toEqual([{ label: "spellPower", value: "2" }]);
    const ring = describeItem({ type: "ring", tier: 1, mods: ["precise"] } as never);
    expect(ring.mods.added.global).toBeUndefined();
  });

  it("lists the few kinds of gear its mod can go on", () => {
    expect(describeItem({ name: "Wolf Card", base: "card", mod: "sharp" }).fits).toEqual([
      "weapon",
      "ranged",
    ]);
    expect(describeItem({ name: "Bear Card", base: "card", mod: "strong" }).fits).toEqual([
      "gloves",
      "ring",
    ]);
    expect(describeItem({ name: "Sword", base: "sword" }).fits).toBeUndefined();
  });
});
