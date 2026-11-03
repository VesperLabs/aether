/*
 * The server rejected the hero's position. Small misses ease in over a few frames while input keeps
 * working; large ones snap.
 */

interface Vector {
  x: number;
  y: number;
}

/** Past this the hero jumps straight to the server's spot: easing across it would look like a slide. */
export const SNAP_DISTANCE = 96;
/** How quickly the hero eases in: about two thirds of the way every this many ms. */
const EASE_MS = 40;
/** Closer than this the rest is taken in one step. */
const DONE_DISTANCE = 0.5;

/** Snap to the server's spot, or ease the hero by `offset` over the next frames. */
export type CorrectionPlan = { snap: true } | { snap: false; offset: Vector };

export function planCorrection(from: Vector, to: Vector): CorrectionPlan {
  const offset = { x: to.x - from.x, y: to.y - from.y };
  if (Math.hypot(offset.x, offset.y) <= SNAP_DISTANCE) return { snap: false, offset };
  return { snap: true };
}

/** This frame's share of an easing still owed, and what is left after it (undefined once done). */
export function easeCorrection(left: Vector, deltaMs: number): { step: Vector; left?: Vector } {
  if (Math.hypot(left.x, left.y) < DONE_DISTANCE) return { step: left };
  const share = 1 - Math.exp(-deltaMs / EASE_MS);
  const step = { x: left.x * share, y: left.y * share };
  return { step, left: { x: left.x - step.x, y: left.y - step.y } };
}
