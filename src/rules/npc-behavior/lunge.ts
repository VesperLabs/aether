import type { NpcMovement } from "./decide";
import { NPC_LUNGE_DISTANCE, NPC_LUNGE_MS, NPC_LUNGE_RECOVERY_MS } from "./constants";

export interface LungeState {
  /** When the last lunge started, in ms. */
  lungeAt?: number;
  /** Which way it is lunging, in radians: at where the target stood when the windup began. */
  lungeAngle?: number;
}

/** True while a lunge is carrying the NPC forward. */
export function isLunging(state: LungeState, now: number) {
  return state.lungeAt !== undefined && now - state.lungeAt < NPC_LUNGE_MS;
}

/** True through the lunge and the pause after it, when it can be punished. */
export function isRecoveringFromLunge(state: LungeState, now: number) {
  return state.lungeAt !== undefined && now - state.lungeAt < NPC_LUNGE_MS + NPC_LUNGE_RECOVERY_MS;
}

/** Overrides whatever the NPC wanted to do: dash forward, then stand still to recover. */
export function decideLungeMovement(state: LungeState, now: number): NpcMovement | undefined {
  if (isLunging(state, now)) return { type: "lunge", angle: state.lungeAngle ?? 0 };
  if (isRecoveringFromLunge(state, now)) return { type: "standStill" };
  return undefined;
}

/** Velocity of a lunge along `angle`, in pixels per second. */
export function getLungeVelocity(angle: number) {
  const speed = NPC_LUNGE_DISTANCE / (NPC_LUNGE_MS / 1000);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
