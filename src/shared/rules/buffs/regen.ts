import { modifyStat } from "@/shared/rules/combat";
import type { ActiveBuff } from "./rules";

/** How often, in ms, each kind of regeneration ticks. */
export const HP_REGEN_INTERVAL = 5000;
export const HP_BUFF_REGEN_INTERVAL = 5000;
export const MP_REGEN_INTERVAL = 1000;
export const SP_REGEN_INTERVAL = 600;
export const POISON_INTERVAL = 1000;

export interface RegenTimers {
  lastHpBuffRegen: number;
  lastHpRegen: number;
  lastMpRegen: number;
  lastSpRegen: number;
  lastBuffPoison: number;
}

export interface RegenInput {
  isDead: boolean;
  buffs: ActiveBuff[] | undefined;
  stats: Record<string, any>;
  timers: RegenTimers;
  now: number;
}

export interface RegenFlags {
  doHpRegen: boolean;
  doHpBuffRegen: boolean;
  doMpRegen: boolean;
  doSpRegen: boolean;
  doBuffPoison: boolean;
}

export interface RegenResult {
  /** Which ticks happened (the client plays an effect for each). */
  flags: RegenFlags;
  /** New `hp`, `mp` and `sp`, only the ones that changed. */
  stats: { hp?: number; mp?: number; sp?: number };
  /** Timers to store, only the ones that ticked. */
  timers: Partial<RegenTimers>;
  /** Poison ticked: the character counts as in combat now, so combat-dispelled buffs go. */
  enteredCombat: boolean;
}

/**
 * One tick of regeneration. mp and sp regenerate on their own, hp regenerates with a
 * regeneration buff or while resting (out of combat), and poison takes hp away.
 * Dead characters don't tick. Nothing is changed: the result says what to store.
 */
export function runRegen({ isDead, buffs, stats, timers, now }: RegenInput): RegenResult {
  const isResting = buffs?.some((b) => ["rest"]?.includes(b?.name as string));
  const regenBuff = buffs?.find((b) => ["regeneration"]?.includes(b?.name as string));
  const poisonBuff = buffs?.find((b) => ["poison"]?.includes(b?.name as string));
  const isHpBuffRegenReady = now - timers.lastHpBuffRegen > HP_BUFF_REGEN_INTERVAL;
  const isHpRegenReady = now - timers.lastHpRegen > HP_REGEN_INTERVAL;
  const isMpRegenReady = now - timers.lastMpRegen > MP_REGEN_INTERVAL;
  const isSpRegenReady = now - timers.lastSpRegen > SP_REGEN_INTERVAL;
  const isBuffPoisonReady = now - timers.lastBuffPoison > POISON_INTERVAL;

  const flags: RegenFlags = {
    doHpRegen: false,
    doHpBuffRegen: false,
    doMpRegen: false,
    doSpRegen: false,
    doBuffPoison: false,
  };
  const changedTimers: Partial<RegenTimers> = {};
  const result: RegenResult = { flags, stats: {}, timers: changedTimers, enteredCombat: false };
  if (isDead) return result;

  const work = { ...stats };
  const change = (key: "hp" | "mp" | "sp", amount: unknown) => {
    const value = modifyStat(work, key, amount);
    if (value !== undefined) work[key] = value;
  };

  if (isMpRegenReady && work.mp < work.maxMp) {
    flags.doMpRegen = true;
    changedTimers.lastMpRegen = now;
    change("mp", work.regenMp);
  }

  if (isSpRegenReady && work.sp < work.maxSp) {
    flags.doSpRegen = true;
    changedTimers.lastSpRegen = now;
    change("sp", work.regenSp);
  }

  if (regenBuff) {
    if (isHpBuffRegenReady && work.hp < work.maxHp) {
      flags.doHpBuffRegen = true;
      changedTimers.lastHpBuffRegen = now;
      change("hp", regenBuff?.stats?.regenHp || 0);
    }
  }

  if (isResting) {
    if (isHpRegenReady && work.hp < work.maxHp) {
      flags.doHpRegen = true;
      changedTimers.lastHpRegen = now;
      change("hp", work.regenHp);
    }
  }

  if (poisonBuff) {
    if (isBuffPoisonReady) {
      flags.doBuffPoison = true;
      changedTimers.lastBuffPoison = now;
      result.enteredCombat = true;
      change("hp", -(poisonBuff?.stats?.poisonDamage || 0));
    }
  }

  for (const key of ["hp", "mp", "sp"] as const) {
    if (!Object.is(work[key], stats[key])) result.stats[key] = work[key];
  }
  return result;
}
