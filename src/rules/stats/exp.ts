export interface ExpValueInput {
  /** The killer's level. */
  playerLevel: number | string | undefined;
  mobLevel: number | string | undefined;
}

export const PLAYER_BASE_EXP = 50; // base experience needed for level 1

/** A player levels up after about this many kills of mobs their own level. */
const KILLS_PER_LEVEL = 25;
/** Fewest exp a mob that gives any is worth. */
const MIN_MOB_EXP = 5;
/** Extra exp per level a mob is above the player, up to `EXP_LEVEL_GAP` levels. */
const EXP_BONUS_PER_LEVEL_ABOVE = 0.1;
/** Exp lost per level a mob is below the player. */
const EXP_PENALTY_PER_LEVEL_BELOW = 0.15;
/** Past this many levels below the player a mob gives nothing; above, the bonus stops growing. */
const EXP_LEVEL_GAP = 5;

/**
 * Exp from a mob: a `KILLS_PER_LEVEL`th of the exp bar at the mob's level, more for mobs above the
 * player, less for mobs below, none more than 5 levels below.
 */
export function calculateExpValue({ playerLevel, mobLevel }: ExpValueInput): number {
  const player = parseInt(playerLevel as string) || 0;
  const mob = parseInt(mobLevel as string) || 0;
  const gap = mob - player;
  if (gap < -EXP_LEVEL_GAP) return 0; // Mob too wimpy. no exp.

  const levelMultiplier =
    gap >= 0
      ? 1 + EXP_BONUS_PER_LEVEL_ABOVE * Math.min(gap, EXP_LEVEL_GAP)
      : 1 + EXP_PENALTY_PER_LEVEL_BELOW * gap;
  const base = Math.max(MIN_MOB_EXP, calculateNextMaxExp(Math.max(1, mob)) / KILLS_PER_LEVEL);
  return Math.max(1, Math.round(base * levelMultiplier));
}

/** How much exp is needed for the next level each time a player levels up. */
export function calculateNextMaxExp(level: number): number {
  const baseExp = PLAYER_BASE_EXP;
  let totalExp = baseExp;

  for (let i = 2; i <= level; i++) {
    totalExp += baseExp + baseExp * 0.1 * (i - 1);
  }

  return Math.floor(totalExp);
}
