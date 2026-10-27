import { describe, expect, it } from "vitest";
import {
  addBuffBonuses,
  applyBuff,
  checkResting,
  createBuff,
  dispelBuffsByProperty,
  expireBuffByName,
  expireBuffs,
  getBuff,
  hasBuff,
  runRegen,
  type ActiveBuff,
  type RegenTimers,
} from "./index";

const NOW = 100000;

describe("hasBuff and getBuff", () => {
  const buffs = [{ name: "haste" }, { name: "rest" }];
  it("find buffs by name", () => {
    expect(hasBuff(buffs, "rest")).toBe(true);
    expect(hasBuff(buffs, "stun")).toBe(false);
    expect(getBuff(buffs, "haste")).toBe(buffs[0]);
    expect(getBuff(undefined, "haste")).toBeUndefined();
  });
});

describe("createBuff", () => {
  it("is null for unknown buffs", () => {
    expect(createBuff({ name: "nope", level: 1, now: NOW })).toBeNull();
  });
  it("copies the definition with name, level and spawn time", () => {
    const buff = createBuff({ name: "haste", level: 2, now: NOW });
    expect(buff).toMatchObject({
      name: "haste",
      level: 2,
      spawnTime: NOW,
      duration: 30000,
      stats: { walkSpeed: 20, attackDelay: -25, castDelay: -100 },
      percentStats: {},
    });
  });
  it("only scales stats for buffs that ask for it", () => {
    const evasion = createBuff({ name: "evasion", level: 3, now: NOW });
    expect(evasion?.stats?.dodgeChance).toBe(5);
    expect(createBuff({ name: "poison", level: 3, now: NOW })?.duration).toBe(6000);
  });
  it("makes regeneration stronger with the caster's spell power", () => {
    expect(
      createBuff({ name: "regeneration", level: 1, casterSpellPower: 23, now: NOW })?.stats,
    ).toEqual({
      regenHp: 3 + 4,
    });
    expect(createBuff({ name: "regeneration", level: 1, now: NOW })?.stats?.regenHp).toBe(3);
  });
  it("doesn't change the content definition", () => {
    createBuff({ name: "regeneration", level: 1, casterSpellPower: 50, now: NOW });
    expect(createBuff({ name: "regeneration", level: 1, now: NOW })?.stats?.regenHp).toBe(3);
  });
});

describe("applyBuff and dispel", () => {
  it("replaces a buff of the same name", () => {
    const old: ActiveBuff = { name: "haste", level: 1 };
    const next: ActiveBuff = { name: "haste", level: 2 };
    expect(applyBuff([old, { name: "rest" }], next)).toEqual([{ name: "rest" }, next]);
  });
  it("flags buffs by property without changing the originals", () => {
    const buffs = [{ name: "rest", dispelInCombat: true }, { name: "haste" }];
    const result = dispelBuffsByProperty(buffs, "dispelInCombat");
    expect(result.map((b) => b.isExpired)).toEqual([true, undefined]);
    expect(buffs[0]).not.toHaveProperty("isExpired");
  });
  it("flags buffs by name", () => {
    expect(expireBuffByName([{ name: "stealth" }, { name: "rest" }], "stealth")[0].isExpired).toBe(
      true,
    );
  });
});

describe("expireBuffs", () => {
  const buff = (name: string, duration: number, age: number, extra = {}): ActiveBuff => ({
    name,
    duration,
    spawnTime: NOW - age,
    ...extra,
  });

  it("removes timed out and flagged buffs, keeps unlimited ones", () => {
    const { buffs, changed } = expireBuffs(
      [
        buff("a", 1000, 2000),
        buff("b", -1, 99999),
        buff("c", 1000, 10),
        buff("d", 5000, 1, { isExpired: true }),
      ],
      NOW,
    );
    expect(buffs.map((b) => b.name)).toEqual(["b", "c"]);
    expect(changed).toBe(true);
  });
  it("reports no change when nothing expires", () => {
    expect(expireBuffs([buff("a", 1000, 10)], NOW).changed).toBe(false);
  });
  it("removes everything when forced", () => {
    expect(expireBuffs([buff("a", -1, 0)], NOW, true)).toEqual({ buffs: [], changed: true });
    expect(expireBuffs([], NOW, true).changed).toBe(false);
  });
  it("removes neighbouring expired buffs in the same call", () => {
    const buffs = [buff("a", 10, 100), buff("b", 10, 100), buff("c", 10, 100)];
    expect(expireBuffs(buffs, NOW)).toEqual({ buffs: [], changed: true });
  });
});

describe("checkResting", () => {
  it("starts resting when out of combat and not poisoned", () => {
    expect(checkResting([], 0, 6000)).toEqual({ shouldAddRest: true, isResting: true });
  });
  it("doesn't while in combat, poisoned, or already resting", () => {
    expect(checkResting([], 5000, 6000).shouldAddRest).toBe(false);
    expect(checkResting([{ name: "poison" }], 0, 6000).shouldAddRest).toBe(false);
    expect(checkResting([{ name: "rest" }], 0, 6000)).toEqual({
      shouldAddRest: false,
      isResting: true,
    });
  });
});

describe("runRegen", () => {
  const timers = (ago: number): RegenTimers => ({
    lastHpBuffRegen: NOW - ago,
    lastHpRegen: NOW - ago,
    lastMpRegen: NOW - ago,
    lastSpRegen: NOW - ago,
    lastBuffPoison: NOW - ago,
  });
  const stats = {
    hp: 5,
    maxHp: 10,
    mp: 1,
    maxMp: 3,
    sp: 1,
    maxSp: 3,
    regenHp: 2,
    regenMp: 1,
    regenSp: 1,
  };
  const run = (overrides = {}) =>
    runRegen({ isDead: false, buffs: [], stats, timers: timers(10000), now: NOW, ...overrides });

  it("regenerates mp and sp on their own", () => {
    const result = run();
    expect(result.flags).toMatchObject({ doMpRegen: true, doSpRegen: true, doHpRegen: false });
    expect(result.stats).toEqual({ mp: 2, sp: 2 });
    expect(result.timers).toEqual({ lastMpRegen: NOW, lastSpRegen: NOW });
  });
  it("waits for each interval", () => {
    expect(run({ timers: timers(500) }).flags.doMpRegen).toBe(false);
    expect(run({ timers: timers(700) }).flags).toMatchObject({ doMpRegen: false, doSpRegen: true });
  });
  it("regenerates hp while resting, and from a regeneration buff", () => {
    expect(run({ buffs: [{ name: "rest" }] }).stats.hp).toBe(7);
    const both = run({
      buffs: [{ name: "rest" }, { name: "regeneration", stats: { regenHp: 3 } }],
    });
    expect(both.stats.hp).toBe(10);
    expect(both.flags).toMatchObject({ doHpRegen: true, doHpBuffRegen: true });
  });
  it("poison takes hp and puts the character in combat", () => {
    const result = run({ buffs: [{ name: "poison", stats: { poisonDamage: 2 } }] });
    expect(result.stats.hp).toBe(3);
    expect(result.enteredCombat).toBe(true);
    expect(result.flags.doBuffPoison).toBe(true);
  });
  it("does nothing for the dead", () => {
    const result = run({ isDead: true, buffs: [{ name: "rest" }] });
    expect(result.flags).toEqual({
      doHpRegen: false,
      doHpBuffRegen: false,
      doMpRegen: false,
      doSpRegen: false,
      doBuffPoison: false,
    });
    expect(result.stats).toEqual({});
  });
  it("doesn't change its input", () => {
    run({ buffs: [{ name: "rest" }] });
    expect(stats.hp).toBe(5);
  });
});

describe("addBuffBonuses", () => {
  it("adds flat and percent bonuses, including a buff with only percentStats", () => {
    const buffs: ActiveBuff[] = [{ stats: { strength: 2 } }, { percentStats: { strength: 10 } }];
    expect(addBuffBonuses(buffs, { strength: 5 }, { strength: 0 })).toEqual({
      baseStats: { strength: 7 },
      percentStats: { strength: 10 },
    });
  });
});
