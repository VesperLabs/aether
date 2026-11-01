import { describe, expect, it } from "vitest";
import { calculateStats, getBaseStats, type StatsInput } from "./rules";

const dagger = {
  type: "weapon",
  stats: { attackDelay: 140, minDamage: 2, maxDamage: 4 },
  triggers: [{ event: "onAttackHit", type: "buff", name: "haste", level: 1, chance: 5 }],
};
const axe = {
  type: "weapon",
  stats: { attackDelay: 400, minDamage: 10, maxDamage: 12, minFireDamage: 3, maxFireDamage: 5 },
};
const shield = { type: "shield", stats: { attackDelay: 60, defense: 10, blockChance: 10 } };
const ring = { type: "ring", stats: { blockChance: 5, critChance: 5 } };

const rogue = (equipment: StatsInput["equipment"]): StatsInput => ({
  baseStats: getBaseStats({ level: 1, charClass: "rogue" }),
  stats: { hp: 0, mp: 0, sp: 0, exp: 0 },
  equipment,
  activeItemSlots: Object.keys(equipment ?? {}),
});

describe("calculateStats hands", () => {
  it("gives each dual-wielded weapon its own damage, delay and triggers", () => {
    const single = calculateStats(rogue({ handRight: axe })).stats;
    const { stats, offHandStats } = calculateStats(rogue({ handRight: axe, handLeft: dagger }));
    const daggerOnly = calculateStats(rogue({ handLeft: dagger })).stats;

    expect(stats.minDamage).toBe(single.minDamage);
    expect(stats.maxFireDamage).toBe(5);
    expect(stats.attackDelay).toBe(single.attackDelay);
    expect(stats.triggers).toEqual([]);

    expect(offHandStats?.minDamage).toBe(daggerOnly.minDamage);
    expect(offHandStats?.maxFireDamage).toBeUndefined();
    expect(offHandStats?.triggers).toHaveLength(1);
    expect(stats.offHandAttackDelay).toBe(daggerOnly.attackDelay);
  });

  it("has no off-hand stats with one weapon", () => {
    expect(
      calculateStats(rogue({ handRight: axe, handLeft: shield })).offHandStats,
    ).toBeUndefined();
  });

  it("slows the weapon by the shield's delay", () => {
    const bare = calculateStats(rogue({ handRight: axe })).stats;
    const shielded = calculateStats(rogue({ handRight: axe, handLeft: shield })).stats;
    expect(shielded.attackDelay).toBe(bare.attackDelay + 60);
  });

  it("only blocks with a shield", () => {
    expect(calculateStats(rogue({ handRight: axe, ring1: ring })).stats.blockChance).toBe(0);
    expect(calculateStats(rogue({ handLeft: shield, ring1: ring })).stats.blockChance).toBe(15);
  });

  it("keeps a mob's own block chance without a shield", () => {
    const input = rogue({});
    input.baseStats = { ...input.baseStats, blockChance: 5 };
    expect(calculateStats(input).stats.blockChance).toBe(5);
  });
});
