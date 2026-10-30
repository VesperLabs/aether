/**
 * The dodge roll: a short burst of speed in an aimed direction, invulnerable while it lasts. The
 * client moves its own hero through it (walls stop it like walking); the server checks the cost
 * and cooldown, grants the extra move budget and owns the invulnerable window.
 */

export const DODGE_SP_COST = 5;
export const DODGE_COOLDOWN = 1200;
export const DODGE_DURATION = 180;
/** Pixels covered by a full roll in open ground. */
export const DODGE_DISTANCE = 96;

export interface DodgeState {
  isDead?: boolean;
  /** When the last roll started, in ms. */
  lastDodge?: number;
}

export interface DodgeInput {
  state: DodgeState;
  sp: number;
  isStunned: boolean;
  now: number;
}

export function canDodge({ state, sp, isStunned, now }: DodgeInput) {
  if (state.isDead || isStunned) return false;
  if (sp < DODGE_SP_COST) return false;
  return now - (state.lastDodge ?? 0) >= DODGE_COOLDOWN;
}

/** True while a roll is in progress: the roller moves at dodge speed and can't be hurt. */
export function isDodging(state: DodgeState, now: number) {
  const elapsed = now - (state.lastDodge ?? -Infinity);
  return elapsed >= 0 && elapsed < DODGE_DURATION;
}

/** Velocity of a roll along `angle` (radians), in pixels per second. */
export function getDodgeVelocity(angle: number) {
  const speed = DODGE_DISTANCE / (DODGE_DURATION / 1000);
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

/** 0 right after a roll, 1 once the next one is ready. */
export function getDodgeReadiness(state: DodgeState, now: number) {
  return Math.min(1, Math.max(0, (now - (state.lastDodge ?? 0)) / DODGE_COOLDOWN));
}
