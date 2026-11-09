import { HAND_REACH, getAttackHandOffset } from "@/content";
import { getAngleFromDirection } from "../world";
import type { Shape } from "../movement";
import { usesLeftHand, usesRightHand } from "./shape";

/** How wide a swing sweeps, in degrees, centred on the facing direction. */
export const SWING_DEGREES = 150;
/**
 * The trail drawn behind the blade, as a share of the sweep. The blade reaches the end of the
 * sweep this much before the swing's art is done fading.
 */
export const SWING_TRAIL_FRACTION = 0.7;
/** A punch jabs straight ahead: this wide a wedge, all at once. */
const PUNCH_DEGREES = 60;
/** The shortest a punch reaches past the fist, in pixels. */
const MIN_PUNCH_REACH = 8;

export interface SwingInput {
  direction?: string;
  /** The attack animation (`attack_right`, `attack_left`, or `stand` for characters without one). */
  action: string;
  race?: string;
  /** How far the swinging hand's weapon reaches from the body centre, in pixels. */
  reach: number;
  /** The weapon has its own range stat, so the reach is measured to the hand, then the blade. */
  hasWeaponRange: boolean;
  /** A human swinging an empty hand. */
  isPunching: boolean;
  /** The hand holds a fist weapon (a katar): it swings up instead of down when facing sideways. */
  isUppercut: boolean;
  /** Where the swing turns when there is no hand to turn around: from the character's position. */
  bodyPivotY: number;
  /** How long the swing's art shows, in ms: the blade's timing comes from it. */
  visibleMs: number;
}

/** A swing worked out once, when cast: everything but where the caster is now. */
export interface SwingPlan {
  /** Where the wedge turns, from the caster's position. */
  pivot: { x: number; y: number };
  radius: number;
  /** Where the blade starts, in degrees. */
  start: number;
  /** Which way it turns: 1 clockwise on screen, -1 counter-clockwise. */
  turn: 1 | -1;
  /** How far it turns in all, in degrees. */
  degrees: number;
  /** How long the blade takes to get there, in ms; 0 is all at once. */
  sweepMs: number;
}

/**
 * Which way a swing turns, as the client draws it. Facing sideways a blade comes down (clockwise
 * facing right) and a katar uppercuts; facing up or down, left-hand swings turn clockwise.
 */
export function isSwingClockwise(
  direction: string | undefined,
  action: string,
  isUppercut: boolean,
) {
  if (direction === "right" || direction === "left") return (direction === "right") !== isUppercut;
  return usesLeftHand(action) && !usesRightHand(action);
}

/**
 * The swing's wedge: around the swinging hand (as drawn in the attack frame) when there is one,
 * else around the body, facing the way the character does.
 */
export function planSwing(input: SwingInput): SwingPlan {
  const { direction, action, race, reach, isPunching, isUppercut } = input;
  const isLeft = usesLeftHand(action);
  const isWielded = isLeft || usesRightHand(action);
  const hand = isLeft && !usesRightHand(action) ? "handLeft" : "handRight";
  const handOffset = isWielded ? getAttackHandOffset(race, direction, action, hand) : undefined;
  const pivot = handOffset ?? { x: 0, y: input.bodyPivotY };
  const facing = getAngleFromDirection(direction ?? "down");
  if (isPunching) {
    return {
      pivot,
      radius: Math.max(MIN_PUNCH_REACH, reach - HAND_REACH),
      start: facing - PUNCH_DEGREES / 2,
      turn: 1,
      degrees: PUNCH_DEGREES,
      sweepMs: 0,
    };
  }
  const turn = isSwingClockwise(direction, action, isUppercut) ? 1 : -1;
  /* From the hand, the weapon's range stat counts the hand's own reach too */
  const radius = handOffset && input.hasWeaponRange ? reach - HAND_REACH : reach;
  return {
    pivot,
    radius,
    start: facing - (SWING_DEGREES / 2) * turn,
    turn,
    degrees: SWING_DEGREES,
    sweepMs: input.visibleMs / (1 + SWING_TRAIL_FRACTION),
  };
}

/** How long a swing's hit lasts: at least until the blade has finished its sweep. */
export function getSwingActiveMs(plan: SwingPlan, activeMs: number | undefined) {
  return Math.max(activeMs ?? 0, plan.sweepMs);
}

/**
 * What the swing has swept `elapsedMs` in, as a wedge from where the caster is now. The whole
 * swept part counts, so a slow tick never skips past a target.
 */
export function getSwingShape(
  plan: SwingPlan,
  caster: { x: number; y: number },
  elapsedMs: number,
): Shape {
  const progress = plan.sweepMs > 0 ? Math.min(1, elapsedMs / plan.sweepMs) : 1;
  const swept = plan.degrees * progress;
  /* Kept as a clockwise wedge: a counter-clockwise swing starts from the far end */
  const from = plan.turn === 1 ? plan.start : plan.start - swept;
  return {
    kind: "sector",
    x: caster.x + plan.pivot.x,
    y: caster.y + plan.pivot.y,
    radius: plan.radius,
    from,
    span: swept,
  };
}
