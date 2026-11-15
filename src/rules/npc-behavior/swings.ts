import type { Rng } from "@/rules/world";

/*
 * A melee NPC mixes its swings: an instant jab for half damage, or a full blow with its usual
 * windup. Rolled per swing, so there's no single rhythm to dance around, and the full blow is the
 * one to bait and punish.
 */

export type NpcSwing = "jab" | "heavy";

/** Each swing's windup, as shares of the warning and of the attack delay, and its damage share. */
const SWINGS: Record<NpcSwing, { warningRatio: number; windupRatio: number; power: number }> = {
  /** Almost instant: no windup at all, for half damage. */
  jab: { warningRatio: 0, windupRatio: 0, power: 0.5 },
  /** Its usual windup (the warning plus its attack delay), for full damage. */
  heavy: { warningRatio: 1, windupRatio: 1, power: 1 },
};

/** Its next swing and how long it winds up: melee rolls jab or heavy, ranged shots don't vary. */
export function decideSwing(
  isRanged: boolean,
  warningMs: number,
  attackDelay: number,
  rng: Rng,
): { windupMs: number; swing?: NpcSwing } {
  if (isRanged) return { windupMs: warningMs + attackDelay };
  const swing: NpcSwing = rng() < 0.5 ? "jab" : "heavy";
  const { warningRatio, windupRatio } = SWINGS[swing];
  return { windupMs: warningMs * warningRatio + attackDelay * windupRatio, swing };
}

/** How hard a swing hits, as a share of its usual damage. */
export const getSwingPower = (swing: NpcSwing | undefined) => (swing ? SWINGS[swing].power : 1);
