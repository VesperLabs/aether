import type { Point } from "@/rules/world";
import { characterHitBox, type CharacterShapeInput } from "@/rules/spells";

/*
 * Capture: throwing a ball at a wild NPC to make it your companion. These rules only aim and roll;
 * the server decides who is catchable and does the taming.
 */

/** Item bases a player can throw at an NPC to try to catch it. */
const THROWABLE_BASES = ["pokeball"];

/** How far a ball flies, in pixels, before it drops. */
const THROW_RANGE = 100;
/** How fast a thrown ball flies, in pixels per second. */
const THROW_SPEED = 360;
/** The least time between two throws, in ms. */
export const THROW_COOLDOWN = 800;
/** How long a creature struggles in the ball before it is caught or breaks free, in ms. */
export const STRUGGLE_MS = 1800;
/** The chance a ball that hits catches its target, 0 to 1. Every ball and NPC alike, for now. */
const CATCH_CHANCE = 0.5;

export const isThrowable = (base: string | undefined) => THROWABLE_BASES.includes(base as string);

/** Whether the last throw, at `lastThrowAt`, is long enough ago to throw again. */
export const canThrow = (lastThrowAt: number | undefined, now: number) =>
  now - (lastThrowAt ?? -Infinity) >= THROW_COOLDOWN;

export interface ThrowTarget extends CharacterShapeInput {
  id: string;
}

export interface ThrowFlight<T extends ThrowTarget> {
  /** The first target in the ball's path, if it hits one. */
  target?: T;
  /** Where the ball stops: the middle of the target, or the end of its range. */
  to: Point;
  /** How long it flies, in ms. */
  flightMs: number;
}

/**
 * Where a ball thrown from `from` at `angle` goes: straight along that line until it meets the
 * first target's hit box, or drops at `THROW_RANGE`.
 */
export function getThrowFlight<T extends ThrowTarget>(
  from: Point,
  angle: number,
  targets: readonly T[],
): ThrowFlight<T> {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best: { target: T; distance: number } | undefined;
  for (const target of targets) {
    const distance = rayHitsBox(from, dx, dy, characterHitBox(target));
    if (distance === undefined || distance > THROW_RANGE) continue;
    if (!best || distance < best.distance) best = { target, distance };
  }
  /* A hit lands in the middle of the target; a miss drops at the end of its range */
  const box = best && characterHitBox(best.target);
  const to = box
    ? { x: box.x, y: box.y }
    : { x: from.x + dx * THROW_RANGE, y: from.y + dy * THROW_RANGE };
  return {
    target: best?.target,
    to,
    flightMs: (Math.hypot(to.x - from.x, to.y - from.y) / THROW_SPEED) * 1000,
  };
}

/** Whether a ball that hit catches its target. `random` is the world's dice, in [0, 1). */
export const rollCatch = (random: () => number, chance = CATCH_CHANCE) => random() < chance;

/** How far along the ray (unit direction `dx`, `dy`) it first enters the box, or undefined. */
function rayHitsBox(
  from: Point,
  dx: number,
  dy: number,
  box: { x: number; y: number; halfWidth: number; halfHeight: number },
): number | undefined {
  let near = 0;
  let far = Infinity;
  const axes: Array<[number, number, number, number]> = [
    [from.x, dx, box.x - box.halfWidth, box.x + box.halfWidth],
    [from.y, dy, box.y - box.halfHeight, box.y + box.halfHeight],
  ];
  for (const [start, step, min, max] of axes) {
    if (Math.abs(step) < 1e-9) {
      if (start < min || start > max) return undefined;
      continue;
    }
    const t1 = (min - start) / step;
    const t2 = (max - start) / step;
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
    if (near > far) return undefined;
  }
  return near;
}
