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

/** An aimed lunge carries on this far past its target, so one running away is still reached. */
export const LUNGE_OVERSHOOT = 12;
/** The furthest an aimed lunge goes, in pixels. */
export const LUNGE_MAX_DISTANCE = 96;
/**
 * The hit area rides this far ahead of the caster, along the lunge: it covers what's in front,
 * and makes up for the server seeing a dashing player a few pixels behind where they are.
 */
export const LUNGE_HIT_LEAD = 16;

export interface LungeState {
  /** When the last lunge started, in ms. */
  lungeAt?: number;
  /** Which way it heads, in radians. */
  lungeAngle?: number;
  /** How long it lasts, in ms; unset means `LUNGE_DURATION`. */
  lungeMs?: number;
}

/** True while a lunge is carrying its caster forward. */
export function isLunging(state: LungeState, now: number) {
  const elapsed = now - (state.lungeAt ?? -Infinity);
  return elapsed >= 0 && elapsed < (state.lungeMs ?? LUNGE_DURATION);
}

/**
 * How long a lunge lasts. Without a target it is the full length. Aimed at a target `distance`
 * away (NPCs, who strike after a windup the target spent moving), it reaches just past them, from
 * half the full length up to `LUNGE_MAX_DISTANCE`.
 */
export function getLungeDuration(distance?: number) {
  if (distance === undefined) return LUNGE_DURATION;
  const pixels = Math.min(
    LUNGE_MAX_DISTANCE,
    Math.max(LUNGE_DISTANCE / 2, distance + LUNGE_OVERSHOOT),
  );
  return (pixels / spellDetails.lunge.spellSpeed) * 1000;
}

/** Velocity of a lunge along `angle` (radians), in pixels per second. */
export function getLungeVelocity(angle: number) {
  const speed = spellDetails.lunge.spellSpeed;
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}
