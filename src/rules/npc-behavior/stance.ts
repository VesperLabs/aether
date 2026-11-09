import type { MobBehavior } from "@/content";

/** Does it go after players on sight, rather than only fighting back? */
export function isNpcAggressive(behaviors: readonly MobBehavior[] | undefined) {
  return !!behaviors?.includes("aggressive");
}

/** Never fights, not even when hit? */
export function isNpcPassive(behaviors: readonly MobBehavior[] | undefined) {
  return !!behaviors?.includes("passive");
}
