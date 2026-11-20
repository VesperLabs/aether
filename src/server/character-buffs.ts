import {
  applyBuff,
  checkResting,
  createBuff,
  dispelBuffsByProperty,
  expireBuffByName,
  expireBuffs,
  runRegen,
  type ActiveBuff,
  type RegenTimers,
} from "@/rules/buffs";
import type { CharacterState } from "@/rules/character";
import { buffList, type BuffDefinition } from "@/content";
import type { GameEventBus } from "@/rules/world";

/** What a buff needs to know about the character that cast it. */
export interface BuffRequest {
  name: string;
  level: number;
  caster?: {
    id?: string;
    socketId?: string;
    stats?: { spellPower?: number };
    x?: number;
    y?: number;
  };
  shouldCalculateStats?: boolean;
}

/** The fields of a server character the buff rules read and write. */
interface BuffHolder {
  buffs: ActiveBuff[];
  stats: Record<string, number>;
  state: CharacterState;
  calculateStats(shouldHeal?: boolean): void;
  knockBack(angle: number): void;
  x: number;
  y: number;
  addBuff(args: BuffRequest): unknown;
  dispelBuffsByProperty(prop: string, value?: unknown): void;
  id?: string;
  socketId?: string;
  world: { now: () => number; events?: GameEventBus };
}

/**
 * Legacy adapters for the pure buff rules (`@/rules/buffs`): pass the character's plain
 * data in, store the result back. Delete in Phase 4 when entities become plain data.
 */

export function applyAddBuff(
  character: BuffHolder,
  { name, level, caster, shouldCalculateStats = true }: BuffRequest,
) {
  const buff = createBuff({
    name,
    level,
    casterSpellPower: caster?.stats?.spellPower,
    now: character.world.now(),
  });
  if (!buff) return false;
  /* Remembered so its `onExpire` hook knows whose it was (a thrown ball's catch) */
  const casterId = caster?.socketId || caster?.id;
  if (casterId) buff.casterId = casterId;

  character.buffs = applyBuff(character.buffs, buff);

  if (shouldCalculateStats) {
    /* A buff that raises max HP or MP fills the new room, so it helps the moment it lands */
    const { maxHp, maxMp } = character.stats;
    character.calculateStats();
    const { stats } = character;
    if (stats.hp > 0) stats.hp += Math.max(0, stats.maxHp - maxHp);
    stats.mp += Math.max(0, stats.maxMp - maxMp);
  }

  character.state.hasBuffChanges = true;

  /* Some buffs (stun) land with a shove, away from whoever applied them */
  const isFromOther = caster && caster !== (character as unknown) && caster.x !== undefined;
  if ((buffList as Record<string, BuffDefinition>)[name]?.knockback && isFromOther) {
    character.knockBack(Math.atan2(character.y - (caster.y ?? 0), character.x - (caster.x ?? 0)));
  }
}

/** Marks every buff whose `prop` is `value` as expired (removed by the next `expireBuffs`). */
export function applyDispel(character: BuffHolder, prop: string, value: unknown = true) {
  character.buffs = dispelBuffsByProperty(character.buffs, prop, value);
}

export function applyExpireBuff(character: BuffHolder, name: string) {
  character.buffs = expireBuffByName(character.buffs, name);
}

/** Removes timed out and dispelled buffs, then recalculates stats and flags the change for sync. */
export function applyExpireBuffs(character: BuffHolder, forceExpire = false) {
  const { buffs, changed, ranOut } = expireBuffs(
    character.buffs,
    character.world.now(),
    forceExpire,
  );
  if (!changed) return;
  character.buffs = buffs;
  character.calculateStats();
  character.state.hasBuffChanges = true;
  const wearerId = character.socketId || character.id;
  if (!wearerId) return;
  for (const { name, casterId, level } of ranOut) {
    character.world.events?.emit("buffExpired", {
      name: name as string,
      wearerId,
      casterId,
      level: level ?? 1,
    });
  }
}

/** One regeneration tick: stores which ticks happened and the resulting hp, mp and sp. */
export function applyRegen(character: BuffHolder, isHealing = true) {
  const now = character.world.now();
  const { flags, stats, timers, enteredCombat } = runRegen({
    isDead: character.state.isDead,
    buffs: character.buffs,
    stats: character.stats,
    timers: character.state as RegenTimers,
    now,
    isHealing,
  });
  Object.assign(character.state, flags, timers);
  if (enteredCombat) {
    character.state.lastCombat = now;
    character.dispelBuffsByProperty("dispelInCombat");
  }
  Object.assign(character.stats, stats);
}

/** Out of combat and not poisoned, bleeding or burning: starts resting. Returns whether the character is resting. */
export function applyCheckIsResting(character: BuffHolder & { stats: { spellPower?: number } }) {
  const { shouldAddRest, isResting } = checkResting(
    character.buffs,
    character.state.lastCombat,
    character.world.now(),
  );
  if (shouldAddRest) {
    character.addBuff({
      name: "rest",
      level: 1,
      caster: character,
      shouldCalculateStats: false,
    });
  }
  return isResting;
}
