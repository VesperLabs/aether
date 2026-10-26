import { buffList } from "@/shared/content";
import { isOutOfCombat } from "@/shared/rules/combat";

/** A buff on a character, as stored on it. Only the fields the buff rules read are named. */
export interface ActiveBuff {
  name?: string;
  duration?: number;
  level?: number;
  spawnTime?: number;
  isExpired?: boolean;
  stats?: Record<string, any>;
  percentStats?: Record<string, any>;
  [property: string]: any;
}

export function hasBuff(buffs: ActiveBuff[] | undefined, name: string): boolean {
  return buffs?.some((b) => b?.name === name) as boolean;
}

export function getBuff(buffs: ActiveBuff[] | undefined, name: string): ActiveBuff | undefined {
  return buffs?.find((b) => b?.name === name);
}

export interface CreateBuffInput {
  name: string;
  level: number;
  /** The caster's spell power. Regeneration heals more the stronger its caster. */
  casterSpellPower?: number | string;
  now: number;
}

function scaleStats(stats: Record<string, number>, level: number) {
  return Object.fromEntries(
    Object.entries(stats).map(([stat, value]) => [stat, value * level]),
  ) as Record<string, number>;
}

/** Builds a buff from its content definition, scaled by level. `null` for an unknown buff. */
export function createBuff({
  name,
  level,
  casterSpellPower,
  now,
}: CreateBuffInput): ActiveBuff | null {
  const definition = (buffList as Record<string, any>)?.[name];
  const buff = definition ? JSON.parse(JSON.stringify(definition)) : null;
  if (!buff) return null;

  const stats: Record<string, number> = buff?.scaleStats
    ? scaleStats(buff.stats || {}, level)
    : buff.stats || {};
  const percentStats = buff?.scaleStats
    ? scaleStats(buff.percentStats || {}, level)
    : buff.percentStats || {};

  if (name === "regeneration") {
    stats.regenHp =
      Number(buff?.stats?.regenHp || 0) + Math.floor(Number(casterSpellPower || 1) / 5);
  }

  return {
    ...buff,
    name,
    duration: buff.scaleDuration ? buff.duration * level : buff.duration,
    level,
    stats,
    percentStats,
    spawnTime: now,
  };
}

/** The buffs with `buff` added. A buff of the same name is replaced, not stacked. */
export function applyBuff(buffs: ActiveBuff[], buff: ActiveBuff): ActiveBuff[] {
  return [...buffs.filter((b) => b?.name !== buff.name), buff];
}

/** Flags every buff whose `prop` is `value` as expired (it is removed on the next expiry check). */
export function dispelBuffsByProperty(
  buffs: ActiveBuff[],
  prop: string,
  value: unknown = true,
): ActiveBuff[] {
  return buffs.map((buff) => (buff?.[prop] === value ? { ...buff, isExpired: true } : buff));
}

/** Flags every buff with this name as expired. */
export function expireBuffByName(buffs: ActiveBuff[], name: string): ActiveBuff[] {
  return buffs.map((buff) => (buff?.name === name ? { ...buff, isExpired: true } : buff));
}

export interface ExpireBuffsResult {
  buffs: ActiveBuff[];
  /** True if any buff was removed. */
  changed: boolean;
}

/**
 * Removes buffs that timed out (a duration of -1 or less never times out) or were flagged expired.
 * `force` removes them all.
 *
 * Known quirk, kept on purpose: when two neighbouring buffs both expire in the same call only
 * the first is removed; the second goes on the next call.
 */
export function expireBuffs(buffs: ActiveBuff[], now: number, force = false): ExpireBuffsResult {
  if (force && buffs?.length > 0) return { buffs: [], changed: true };
  const remaining = [...buffs];
  let changed = false;
  for (let i = 0; i < remaining.length; i++) {
    const buff = remaining[i];
    const limitedBuff = (buff.duration as number) > 0;
    const isTimedOut = now - (buff.spawnTime as number) > (buff.duration as number);
    if (buff?.isExpired || (isTimedOut && limitedBuff)) {
      changed = true;
      remaining.splice(remaining.indexOf(buff), 1);
    }
  }
  return { buffs: remaining, changed };
}

export interface RestingResult {
  /** Rest should be added now. */
  shouldAddRest: boolean;
  isResting: boolean;
}

/** A character that is out of combat, and not poisoned, starts resting. */
export function checkResting(
  buffs: ActiveBuff[] | undefined,
  lastCombat: number,
  now: number,
): RestingResult {
  const isResting = hasBuff(buffs, "rest");
  const isPoisoned = hasBuff(buffs, "poison");
  const shouldAddRest = isOutOfCombat(lastCombat, now) && !isResting && !isPoisoned;
  return { shouldAddRest, isResting: shouldAddRest ? true : isResting };
}
