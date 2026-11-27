/** How a player's input turns into walking velocity: normalised, eased in and out. */

/** How a surface takes a body's steps: seconds to get going, seconds to stop, and its top speed. */
export interface Surface {
  /** Seconds from standing still to full speed (turning takes about as long). */
  accelerate: number;
  /** Seconds from full speed to standing still. */
  decelerate: number;
  /** Share of walk speed it can reach. */
  speedScale: number;
}

/** Ground: quick starts and quicker stops. */
export const GROUND: Surface = { accelerate: 0.08, decelerate: 0.05, speedScale: 1 };
/**
 * Ice: a push-off to get going, a glide that builds past walking pace, wide turns, and a long
 * slide to a stop.
 */
export const ICE: Surface = { accelerate: 0.45, decelerate: 2.4, speedScale: 1.3 };

/** Seconds from standing still to full walk speed. */
export const WALK_ACCELERATION_SECONDS = GROUND.accelerate;
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
 * when slowing down, at the pace of the `surface` underfoot: quick on ground, a slide on ice.
 */
export function approachVelocity(
  current: Vector,
  target: Vector,
  speed: number,
  seconds: number,
  surface: Surface = GROUND,
): Vector {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  if (!distance || speed <= 0) return { ...target };
  const isSlowing = Math.hypot(target.x, target.y) < Math.hypot(current.x, current.y);
  const rampSeconds = isSlowing ? surface.decelerate : surface.accelerate;
  const maxStep = (speed / rampSeconds) * seconds;
  if (distance <= maxStep) return { ...target };
  return { x: current.x + (dx / distance) * maxStep, y: current.y + (dy / distance) * maxStep };
}

/** Wanting more than this share of its top speed is a shove (a lunge, a knockback), taken at once even on ice. */
const IMPULSE_SPEED_SCALE = 1.3;

/**
 * An NPC's velocity after `seconds` on `surface`, from moving at `current` and wanting `desired`
 * (at up to `walkSpeed`). On ground it takes the new velocity at once; on ice it glides faster,
 * turns wide and slides to a stop. A shove (lunge, knockback) lands at once, then slides off on ice.
 */
export function slideVelocity(
  current: Vector,
  desired: Vector,
  seconds: number,
  surface: Surface,
  walkSpeed: number,
): Vector {
  if (surface === GROUND) return { ...desired };
  const wanted = Math.hypot(desired.x, desired.y);
  if (wanted > walkSpeed * IMPULSE_SPEED_SCALE) return { ...desired };
  const target = { x: desired.x * surface.speedScale, y: desired.y * surface.speedScale };
  const speed = Math.max(walkSpeed * surface.speedScale, Math.hypot(current.x, current.y));
  return approachVelocity(current, target, speed, seconds, surface);
}
