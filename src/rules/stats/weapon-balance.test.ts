import { describe, expect, it } from "vitest";
import { ITEM_CATALOG, ItemBuilder, PREVIEW_DICE, type Item } from "@/content";
import { rollAttack } from "@/rules/combat";
import { calculateStats, getBaseStats, npcStats, type StatBag } from "./index";

/*
 * Every melee weapon family against the others: damage per second at each tier, worn at its tier's
 * level against a same-level mob, fists and strength included. Spell weapons (wand, staff) trade
 * damage for spell power and are left out.
 */

const SAMPLES = 4000;
const SPELL_FAMILIES = ["wand", "staff"];
/**
 * No family may stray further than this from the tier's median damage per second. Families are
 * tuned to about the same; what's left is whole-number rounding of small tier 1 damage.
 */
const MAX_SPREAD = 0.12;
/** Who would wield it: dexterity weapons go to a rogue, the rest to a warrior. */
const WIELDER: Record<string, string> = {
  dagger: "rogue",
  fist: "rogue",
  scimitar: "rogue",
  scythe: "rogue",
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function damagePerSecond(def: StatBag): number {
  const level = Number(def.requirements?.level ?? 1);
  const charClass = WIELDER[def.base] ?? "warrior";
  const weapon = ItemBuilder.buildItem(PREVIEW_DICE, def.key) as Item;
  const player = calculateStats(
    {
      baseStats: getBaseStats({ level, charClass }),
      stats: {},
      equipment: { handRight: weapon },
      activeItemSlots: ["handRight"],
    },
    true,
  ).stats;
  const mob = npcStats({ baseStats: { level }, charClass: "warrior" });
  const rng = seeded(7);
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const roll = rollAttack(player, mob, undefined, rng);
    if (roll.outcome === "hit") total += roll.totalDamage;
  }
  return (total / SAMPLES / player.attackDelay) * 1000;
}

const weapons = (Object.values(ITEM_CATALOG) as StatBag[]).filter(
  (def) => def.type === "weapon" && def.rarity === "common" && !SPELL_FAMILIES.includes(def.base),
);

describe("weapon balance", () => {
  for (const tier of [1, 2, 3]) {
    it(`keeps every melee family near the median at tier ${tier}`, () => {
      const rows = weapons
        .filter((def) => def.tier === tier)
        .map((def) => ({ key: def.key, dps: damagePerSecond(def) }));
      const sorted = rows.map((r) => r.dps).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      for (const { key, dps } of rows) {
        expect(
          Math.abs(dps / median - 1),
          `${key}: ${dps.toFixed(1)} vs ${median.toFixed(1)}`,
        ).toBeLessThanOrEqual(MAX_SPREAD);
      }
    });
  }
});
