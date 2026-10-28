/** How a player's input turns into walking velocity: normalised, eased in and out. */

/** Seconds from standing still to full walk speed. */
export const WALK_ACCELERATION_SECONDS = 0.08;
/** Seconds from full walk speed to standing still. */
export const WALK_DECELERATION_SECONDS = 0.05;
/** Fraction of walk speed kept while attacking, aiming or holding attack: rooted, since there are no walking attack animations. */
export const ATTACK_WALK_SPEED_SCALE = 0;

export interface Vector {
  x: number;
  y: number;
}

/**
 * The velocity an input asks for. `input` is -1..1 on each axis (keys or joystick); it is capped
 * at length 1 so diagonals are no faster than straight lines.
 */
export function getWalkVelocity(input: Vector, speed: number): Vector {
  const length = Math.hypot(input.x, input.y);
  if (!length) return { x: 0, y: 0 };
  const scale = speed / Math.max(length, 1);
  return { x: input.x * scale, y: input.y * scale };
}

/**
 * Steps `current` toward `target` over `seconds`, accelerating when speeding up and decelerating
 * when slowing down, so starts and stops are eased but still quick.
 */
export function approachVelocity(
  current: Vector,
  target: Vector,
  speed: number,
  seconds: number,
): Vector {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (!distance || speed <= 0) return { ...target };
  const isSlowing = Math.hypot(target.x, target.y) < Math.hypot(current.x, current.y);
  const rampSeconds = isSlowing ? WALK_DECELERATION_SECONDS : WALK_ACCELERATION_SECONDS;
  const maxStep = (speed / rampSeconds) * seconds;
  if (distance <= maxStep) return { ...target };
  return { x: current.x + (dx / distance) * maxStep, y: current.y + (dy / distance) * maxStep };
}
