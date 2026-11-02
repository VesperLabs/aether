/**
 * Knockback: a short shove away from a hit (a lunge landing). Like a roll it is a forced move
 * the movement code honours over walking or AI, and the one shoved can't turn while it lasts.
 * The server shoves NPCs itself; a player's own client plays the shove when told.
 */

/** How long the shove lasts, in ms. */
export const KNOCKBACK_DURATION = 150;
/** Pixels a full shove covers in open ground. */
export const KNOCKBACK_DISTANCE = 24;

export interface KnockbackState {
  /** When the last shove started, in ms. */
  knockbackAt?: number;
  /** Which way it pushes, in radians. */
  knockbackAngle?: number;
}

/** True while a shove is carrying its victim. */
export function isKnockedBack(state: KnockbackState, now: number) {
  const elapsed = now - (state.knockbackAt ?? -Infinity);
  return elapsed >= 0 && elapsed < KNOCKBACK_DURATION;
}

/**
 * Velocity of a shove along `angle` (radians), in pixels per second, `elapsed` ms in: fast at
 * first and slowing to a stop, covering `KNOCKBACK_DISTANCE` in all.
 */
export function getKnockbackVelocity(angle: number, elapsed: number) {
  const t = Math.min(1, Math.max(0, elapsed / KNOCKBACK_DURATION));
  const speed = ((2 * KNOCKBACK_DISTANCE) / (KNOCKBACK_DURATION / 1000)) * (1 - t);
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}
