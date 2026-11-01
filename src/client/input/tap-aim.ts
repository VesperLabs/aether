import { getAngleFromDirection } from "@/rules/world";
import type { CharacterState } from "@/rules/character";
import type { Player } from "@/client/views/player";

/** A press shorter than this is a tap: go the way you're heading, without aiming. */
const TAP_MS = 250;

/** Whether a tap-aimable press (dodge, lunge) let go before it became a hold. */
export function isTap(state: CharacterState, now: number) {
  return now - (state.aimPressedAt ?? now) < TAP_MS;
}

/** The aimer only shows once a tap-aimable press is long enough to be a hold, so a tap doesn't flash it. */
export function isAimShown(state: CharacterState, now: number) {
  if (!state.isAiming && !state.isAimingDodge) return false;
  return state.aimPressedAt === undefined || !isTap(state, now);
}

/** Where the hero is heading: its movement, or the way it faces when standing still. */
export function getHeadingAngle(hero: Player) {
  if (hero.vx || hero.vy) return Math.atan2(hero.vy ?? 0, hero.vx ?? 0);
  return (getAngleFromDirection(hero.direction) * Math.PI) / 180;
}
