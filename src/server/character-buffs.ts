import {
  applyBuff,
  checkResting,
  createBuff,
  dispelBuffsByProperty,
  expireBuffByName,
  expireBuffs,
  runRegen,
} from "@/shared/rules/buffs";

/** The fields of a server character the buff rules read and write. */
interface BuffHolder {
  buffs: any[];
  stats: any;
  state: any;
  calculateStats(shouldHeal?: boolean): void;
  addBuff(args: AddBuffArgs): unknown;
  dispelBuffsByProperty(prop: string, value?: unknown): void;
}

/**
 * Legacy adapters for the pure buff rules (`@/shared/rules/buffs`): pass the character's plain
 * data in, store the result back. Delete in Phase 4 when entities become plain data.
 */

export function applyAddBuff(
  character: BuffHolder,
  { name, level, caster, shouldCalculateStats = true }: AddBuffArgs,
) {
  const buff = createBuff({
    name,
    level,
    casterSpellPower: caster?.stats?.spellPower,
    now: Date.now(),
  });
  if (!buff) return false;

  character.buffs = applyBuff(character.buffs, buff);

  if (shouldCalculateStats) character.calculateStats();

  character.state.hasBuffChanges = true;
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
  const { buffs, changed } = expireBuffs(character.buffs, Date.now(), forceExpire);
  if (changed) {
    character.buffs = buffs;
    character.calculateStats();
    character.state.hasBuffChanges = true;
  }
}

/** One regeneration tick: stores which ticks happened and the resulting hp, mp and sp. */
export function applyRegen(character: BuffHolder) {
  const now = Date.now();
  const { flags, stats, timers, enteredCombat } = runRegen({
    isDead: character.state.isDead,
    buffs: character.buffs,
    stats: character.stats,
    timers: character.state,
    now,
  });
  Object.assign(character.state, flags, timers);
  if (enteredCombat) {
    character.state.lastCombat = now;
    character.dispelBuffsByProperty("dispelInCombat");
  }
  Object.assign(character.stats, stats);
}

/** Out of combat and not poisoned: starts resting. Returns whether the character is resting. */
export function applyCheckIsResting(character: BuffHolder & { id?: string }) {
  const { shouldAddRest, isResting } = checkResting(
    character.buffs,
    character.state.lastCombat,
    Date.now(),
  );
  if (shouldAddRest) {
    character.addBuff({
      name: "rest",
      level: 1,
      caster: character as unknown as Character,
      shouldCalculateStats: false,
    });
  }
  return isResting;
}
