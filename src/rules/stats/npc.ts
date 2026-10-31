import { calculateStats, getBaseStats, mergeAndAddValues, type StatBag } from "./rules";

/** What an NPC's stats are worked out from: its level, class and any base stats it overrides. */
export interface NpcStatsInput {
  baseStats?: StatBag & { level?: number };
  charClass?: string;
}

/**
 * An NPC's base stats: the class's stats for its level, tuned for monsters (no starting HP or MP,
 * a little more damage, slower walking, and attributes that grow faster with level), plus the
 * NPC's own overrides added on top.
 */
export function npcBaseStats({ baseStats = {}, charClass }: NpcStatsInput): StatBag {
  const level = baseStats.level ?? 1;
  const classStats = getBaseStats({ level, charClass });
  // remove level so it does not get added twice
  const { level: _level, ...tuned } = {
    ...classStats,
    maxHp: 0,
    maxMp: 0,
    maxDamage: classStats.maxDamage + 1,
    minDamage: classStats.minDamage + 1,
    walkSpeed: classStats.walkSpeed - 30,
    intelligence: classStats.intelligence + level * 2,
    strength: classStats.strength + level * 2,
    dexterity: classStats.dexterity + level * 2,
    vitality: classStats.vitality + level * 5,
  };
  return mergeAndAddValues(tuned, baseStats);
}

/** An NPC's full stats as it spawns, before any gear or buffs. */
export function npcStats(npc: NpcStatsInput): StatBag {
  return calculateStats({ baseStats: npcBaseStats(npc), stats: {} }, true).stats;
}
