import { describe, expect, it } from "vitest";
import {
  addValuesToExistingKeys,
  calculateExpValue,
  calculateNextMaxExp,
  calculateStats,
  getBaseStats,
  mergeAndAddValues,
  type StatsInput,
} from "./rules";

const warrior = (overrides: Partial<StatsInput> = {}): StatsInput => ({
  baseStats: getBaseStats({ level: 1, charClass: "warrior" }),
  stats: { hp: 0, mp: 0, sp: 0, exp: 0 },
  ...overrides,
});

describe("calculateExpValue", () => {
  it("is half the higher level, at least 3", () => {
    expect(calculateExpValue({ playerLevel: 1, mobLevel: 1 })).toBe(3);
    expect(calculateExpValue({ playerLevel: 10, mobLevel: 10 })).toBe(5);
    expect(calculateExpValue({ playerLevel: 5, mobLevel: 20 })).toBe(10);
    expect(calculateExpValue({ playerLevel: 20, mobLevel: 15 })).toBe(10);
  });

  it("is zero when the player is more than 5 levels above the mob", () => {
    expect(calculateExpValue({ playerLevel: 16, mobLevel: 10 })).toBe(0);
    expect(calculateExpValue({ playerLevel: 15, mobLevel: 10 })).toBe(7);
  });

  it("reads levels the way parseInt does and treats junk as 0", () => {
    expect(calculateExpValue({ playerLevel: "12", mobLevel: "12abc" })).toBe(6);
    expect(calculateExpValue({ playerLevel: undefined, mobLevel: "x" })).toBe(3);
    expect(calculateExpValue({ playerLevel: 5, mobLevel: undefined })).toBe(3);
    expect(calculateExpValue({ playerLevel: 12, mobLevel: undefined })).toBe(0);
  });
});

describe("calculateNextMaxExp", () => {
  it("grows by 50 + 10% steps per level", () => {
    expect(calculateNextMaxExp(1)).toBe(50);
    expect(calculateNextMaxExp(2)).toBe(105);
    expect(calculateNextMaxExp(3)).toBe(165);
    expect(calculateNextMaxExp(10)).toBe(725);
  });

  it("is the base amount for levels below 2", () => {
    expect(calculateNextMaxExp(0)).toBe(50);
    expect(calculateNextMaxExp(-3)).toBe(50);
  });
});

describe("mergeAndAddValues", () => {
  it("adds shared keys and keeps the rest", () => {
    expect(mergeAndAddValues({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 5, c: 4 });
  });
  it("defaults to empty bags and does not change its inputs", () => {
    expect(mergeAndAddValues()).toEqual({});
    const a = { x: 1 };
    mergeAndAddValues(a, { x: 1 });
    expect(a).toEqual({ x: 1 });
  });
});

describe("addValuesToExistingKeys", () => {
  it("only adds into keys the first bag already has", () => {
    expect(addValuesToExistingKeys({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 5 });
  });
});

describe("getBaseStats", () => {
  it("gives the class stat a head start", () => {
    expect(getBaseStats({ level: 1, charClass: "mage" })).toMatchObject({
      intelligence: 5,
      strength: 1,
      dexterity: 1,
      vitality: 1,
    });
    expect(getBaseStats({ level: 3, charClass: "rogue" }).dexterity).toBe(9);
    expect(getBaseStats({ level: 1, charClass: "cleric" }).vitality).toBe(5);
  });
  it("only warriors get fire resistance", () => {
    expect(getBaseStats({ charClass: "warrior" }).fireResistance).toBe(10);
    expect(getBaseStats({ charClass: "mage" })).not.toHaveProperty("fireResistance");
  });
  it("defaults to level 1", () => {
    expect(getBaseStats({ charClass: "mage" }).level).toBe(1);
  });
});

describe("calculateStats", () => {
  it("derives stats from a fresh level 1 warrior", () => {
    const { stats, activeSets } = calculateStats(warrior(), true);
    expect(activeSets).toEqual([]);
    expect(stats).toMatchObject({
      level: 1,
      strength: 5,
      dexterity: 1,
      vitality: 1,
      intelligence: 1,
      maxHp: 13,
      maxMp: 13,
      maxSp: 20,
      hp: 13,
      mp: 13,
      sp: 20,
      defense: 5,
      minDamage: 0,
      maxDamage: 1,
      fireResistance: 10,
      castDelay: 1000 + 1 - 0,
      attackDelay: 200,
      walkSpeed: 100.03,
      exp: 0,
      triggers: [],
    });
  });

  it("does not change its input", () => {
    const input = warrior({ buffs: [{ stats: { strength: 3 } }] });
    const copy = structuredClone(input);
    calculateStats(input, true);
    expect(input).toEqual(copy);
  });

  it("only heals dead resources when asked", () => {
    expect(calculateStats(warrior(), false).stats).toMatchObject({ hp: 0, mp: 0, sp: 0 });
    expect(calculateStats(warrior(), true).stats).toMatchObject({ hp: 13, mp: 13, sp: 20 });
  });

  it("keeps current hp/mp/sp and clamps them to the new maximum", () => {
    const { stats } = calculateStats(
      warrior({ stats: { hp: 5, mp: 99999, sp: 7, exp: 42 } }),
      true,
    );
    expect(stats).toMatchObject({ hp: 5, mp: 13, sp: 7, exp: 42 });
  });

  it("treats missing stats as a dead character with no exp", () => {
    const { stats } = calculateStats(warrior({ stats: {} }), false);
    expect(stats).toMatchObject({ hp: 0, mp: 0, sp: 0, exp: 0 });
  });

  it("ignores items in slots that are not active", () => {
    const equipment = { head: { key: "h", stats: { strength: 10 } } };
    const inactive = calculateStats(warrior({ equipment, activeItemSlots: [] })).stats;
    const active = calculateStats(warrior({ equipment, activeItemSlots: ["head"] })).stats;
    expect(inactive.strength).toBe(5);
    expect(active.strength).toBe(15);
  });

  it("adds ability stats and collects triggers", () => {
    const trigger = { event: "onHurt", name: "thorns" };
    const { stats } = calculateStats(
      warrior({
        abilities: { "1": { key: "s", stats: { spellPower: 4 }, triggers: [trigger] } },
        activeItemSlots: ["1"],
      }),
    );
    expect(stats.spellPower).toBe(4);
    expect(stats.triggers).toEqual([trigger]);
  });

  it("applies buffs and percent buffs to primary stats", () => {
    const { stats } = calculateStats(
      warrior({ buffs: [{ stats: { strength: 5 }, percentStats: { strength: 50 } }] }),
    );
    // strength 5 + 5 = 10, then +50% = 15
    expect(stats.strength).toBe(15);
  });

  it("scales maxHp by percent stats after the vitality bonus", () => {
    const { stats } = calculateStats(warrior({ buffs: [{ percentStats: { maxHp: 100 } }] }));
    expect(stats.maxHp).toBe(26);
  });

  it("caps crit, dodge and walk speed", () => {
    const { stats } = calculateStats(
      warrior({ buffs: [{ stats: { critChance: 500, dodgeChance: 500, walkSpeed: 5000 } }] }),
    );
    expect(stats).toMatchObject({ critChance: 100, dodgeChance: 75, walkSpeed: 600 });
    const slow = calculateStats(warrior({ buffs: [{ stats: { walkSpeed: -500 } }] })).stats;
    expect(slow.walkSpeed).toBe(15);
  });

  it("activates a set bonus once enough different set pieces are worn", () => {
    const piece = (key: string) => ({ key, setName: "crab" });
    const equipment = { head: piece("a"), body: piece("b") };
    const one = calculateStats(
      warrior({ equipment: { head: piece("a") }, activeItemSlots: ["head"] }),
    );
    expect(one.activeSets).toEqual([]);
    const two = calculateStats(warrior({ equipment, activeItemSlots: ["head", "body"] }));
    expect(two.activeSets).toEqual(["crab"]);
    // Set stats the character does not have yet become NaN and then 0 (legacy quirk).
    expect(two.stats.waterResistance).toBe(0);
    expect(two.stats.vitality).toBe(6);
  });

  it("counts two of the same item as one set piece", () => {
    const piece = { key: "a", setName: "crab" };
    const { activeSets } = calculateStats(
      warrior({
        equipment: { ring1: piece, ring2: piece },
        activeItemSlots: ["ring1", "ring2"],
      }),
    );
    expect(activeSets).toEqual([]);
  });
});
