import { monsterHealth, unarmedDamage } from "./power";
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
    // vitality still adds 3 HP a point, so this lands the total on the monster curve
    maxHp: monsterHealth(level) - classStats.vitality * 3,
    maxMp: 0,
    // claws and teeth: a natural weapon as strong as their fists, added on top of them
    minDamage: classStats.minDamage + unarmedDamage(level)[0],
    maxDamage: classStats.maxDamage + unarmedDamage(level)[1],
    walkSpeed: classStats.walkSpeed - 30,
    intelligence: classStats.intelligence + level,
    strength: classStats.strength + level,
    dexterity: classStats.dexterity + level,
  };
  return mergeAndAddValues(tuned, baseStats);
}

/** An NPC's full stats as it spawns, before any gear or buffs. */
export function npcStats(npc: NpcStatsInput): StatBag {
  return calculateStats({ baseStats: npcBaseStats(npc), stats: {} }, true).stats;
}
