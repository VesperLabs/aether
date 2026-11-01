import { spellDetails } from "@/content";

/**
 * The lunge: a spell that dashes its caster along the aimed angle, hitting whoever it runs
 * through. Warriors and mobs cast the same one. Its length and speed come from the spell's own
 * definition (`maxActiveTime` and `spellSpeed`), so tuning it in content tunes both.
 */

/** How long the dash lasts, in ms. */
export const LUNGE_DURATION = spellDetails.lunge.maxActiveTime;
/** Pixels covered by a full lunge in open ground. */
export const LUNGE_DISTANCE = (spellDetails.lunge.spellSpeed * LUNGE_DURATION) / 1000;

export interface LungeState {
  /** When the last lunge started, in ms. */
  lungeAt?: number;
  /** Which way it heads, in radians. */
  lungeAngle?: number;
}

/** True while a lunge is carrying its caster forward. */
export function isLunging(state: LungeState, now: number) {
  const elapsed = now - (state.lungeAt ?? -Infinity);
  return elapsed >= 0 && elapsed < LUNGE_DURATION;
}

/** Velocity of a lunge along `angle` (radians), in pixels per second. */
export function getLungeVelocity(angle: number) {
  const speed = spellDetails.lunge.spellSpeed;
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}
