import { describe, expect, it } from "vitest";
import { ITEM_CATALOG, ItemBuilder, PREVIEW_DICE, type Item } from "@/content";
import { rollAttack } from "@/rules/combat";
import { calculateStats, getBaseStats, type StatBag } from "./rules";
import { npcStats } from "./npc";
import { defenseReduction, DEFENSE_PER_POWER } from "./power";

/*
 * The balance table: a player against a same-level mob, naked and in the best common gear they
 * could wear. Run it to see the numbers while tuning (`BALANCE=1 npx vitest run src/rules/stats/power --silent=false`).
 */

const LEVELS = [1, 5, 10, 15, 20, 30];
const SAMPLES = 4000;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Average damage per swing, misses and blocks counted as 0. */
function averageHit(attacker: StatBag, victim: StatBag): number {
  const rng = seeded(7);
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const roll = rollAttack(attacker, victim, undefined, rng);
    if (roll.outcome === "hit") total += roll.totalDamage;
  }
  return total / SAMPLES;
}

function requiredLevel(item: { requirements?: Record<string, unknown> }): number {
  return Number(item.requirements?.level ?? 1);
}

/** The common item of `type` with the highest `score` a level `level` player may wear. */
function bestCommon(type: string, level: number, score: (stats: StatBag) => number) {
  const candidates = Object.values(ITEM_CATALOG).filter(
    (item) => item.type === type && item.rarity === "common" && requiredLevel(item) <= level,
  );
  candidates.sort((a, b) => score(rolledMax(b)) - score(rolledMax(a)));
  const key = candidates[0]?.key;
  return key ? (ItemBuilder.buildItem(PREVIEW_DICE, key) as Item) : null;
}

function rolledMax(def: StatBag): StatBag {
  const out: StatBag = {};
  for (const [key, value] of Object.entries(def.stats ?? {})) {
    out[key] = Array.isArray(value) ? value[1] : value;
  }
  return out;
}

const ARMOR_SLOTS = ["helmet", "armor", "gloves", "boots", "pants"] as const;

function warrior(level: number, geared: boolean): StatBag {
  const equipment: Record<string, Item | null> = {};
  if (geared) {
    equipment.handRight = bestCommon(
      "weapon",
      level,
      (s) => (s.maxDamage ?? 0) * 1000 - (s.attackDelay ?? 0),
    );
    for (const slot of ARMOR_SLOTS)
      equipment[slot] = bestCommon(slot, level, (s) => s.defense ?? 0);
  }
  return calculateStats(
    {
      baseStats: getBaseStats({ level, charClass: "warrior" }),
      stats: {},
      equipment,
      activeItemSlots: Object.keys(equipment),
    },
    true,
  ).stats;
}

function tableRow(level: number) {
  const mob = npcStats({ baseStats: { level }, charClass: "warrior" });
  const naked = warrior(level, false);
  const geared = warrior(level, true);
  const nakedHit = averageHit(naked, mob);
  const gearedHit = averageHit(geared, mob);
  return {
    level,
    mobHp: mob.maxHp,
    nakedHit: +nakedHit.toFixed(1),
    gearedHit: +gearedHit.toFixed(1),
    gearGain: +(gearedHit / nakedHit).toFixed(2),
    hitsToKill: +(mob.maxHp / gearedHit).toFixed(1),
    playerHp: geared.maxHp,
    mobHit: +averageHit(mob, geared).toFixed(1),
    hitsToDie: +(geared.maxHp / averageHit(mob, geared)).toFixed(1),
  };
}

describe("balance table", () => {
  const rows = LEVELS.map(tableRow);

  it("prints", () => {
    if (process.env.BALANCE) console.table(rows);
    expect(rows.length).toBe(LEVELS.length);
  });

  it("kills a same-level mob in a handful of geared hits at every level", () => {
    for (const row of rows) {
      expect(row.hitsToKill, `level ${row.level}`).toBeGreaterThanOrEqual(3);
      expect(row.hitsToKill, `level ${row.level}`).toBeLessThanOrEqual(8);
    }
  });

  it("makes gear worth at least 50% more damage at every level", () => {
    for (const row of rows) expect(row.gearGain, `level ${row.level}`).toBeGreaterThanOrEqual(1.5);
  });

  it("lets a geared player survive several hits from a same-level mob", () => {
    for (const row of rows) expect(row.hitsToDie, `level ${row.level}`).toBeGreaterThanOrEqual(5);
  });
});

describe("defense", () => {
  it("never stops all damage", () => {
    expect(defenseReduction(10_000, 1)).toBeLessThan(1);
  });

  it("stops half the damage when it matches the attacker's power", () => {
    expect(defenseReduction(DEFENSE_PER_POWER, 1)).toBe(0.5);
    expect(defenseReduction(DEFENSE_PER_POWER * 2, 9)).toBe(0.5);
  });
});
