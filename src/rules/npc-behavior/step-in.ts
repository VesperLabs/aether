import type { NpcMovement } from "./movement";

/*
 * The step-in: as a melee swing fires, the NPC surges a little way along its aim, so backing off
 * just out of reach during the windup doesn't make it whiff. Like a shove it starts fast and eases
 * to a stop, so it reads as leaning into the blow rather than a jump. The swing's hit area rides
 * along with it.
 */

/** How long the surge lasts, in ms: about as long as the swing's sweep. */
export const STEP_IN_DURATION = 180;
/** The furthest it surges, in pixels. */
export const STEP_IN_MAX_DISTANCE = 28;

export interface StepInState {
  /** When the last step-in started, in ms. */
  stepInAt?: number;
  /** Which way it surges, in radians. */
  stepInAngle?: number;
  /** How far it surges, in pixels. */
  stepInDistance?: number;
}

/** How far to surge with `gap` pixels between the two bodies' edges: up to them, never into them. */
export const getStepInDistance = (gap: number) => Math.min(STEP_IN_MAX_DISTANCE, Math.max(0, gap));

/** True while a step-in is carrying its NPC. */
export function isSteppingIn(state: StepInState, now: number) {
  const elapsed = now - (state.stepInAt ?? -Infinity);
  return elapsed >= 0 && elapsed < STEP_IN_DURATION && (state.stepInDistance ?? 0) > 0;
}

/**
 * Velocity of a step-in `elapsed` ms in, px/s: fast at first and easing to a stop, covering
 * `distance` in all.
 */
export function getStepInVelocity(angle: number, distance: number, elapsed: number) {
  const t = Math.min(1, Math.max(0, elapsed / STEP_IN_DURATION));
  const speed = ((2 * distance) / (STEP_IN_DURATION / 1000)) * (1 - t);
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}

/** While it lasts, the step-in overrides whatever the NPC wanted to do with its feet. */
export function decideStepInMovement(state: StepInState, now: number): NpcMovement | undefined {
  if (!isSteppingIn(state, now)) return undefined;
  const elapsed = now - (state.stepInAt ?? now);
  return {
    type: "stepIn",
    angle: state.stepInAngle ?? 0,
    distance: state.stepInDistance ?? 0,
    elapsed,
  };
}
