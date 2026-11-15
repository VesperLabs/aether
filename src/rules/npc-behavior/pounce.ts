import type { Point } from "@/rules/world";
import { LUNGE_MAX_DISTANCE, LUNGE_SPEED } from "@/rules/movement";
import { NPC_POUNCE_STOP_SHORT } from "./constants";

/*
 * The pounce: a spell that `pounces` winds up like any lunge (the tell), then carries its caster,
 * touching no one, to where the target will be when it lands. No recovery after: it is free to
 * attack as usual once it lands.
 */

/** A moving body: where it is and how fast it goes, px/s. */
interface Mover extends Point {
  vx?: number;
  vy?: number;
}

/** Where `target` will be in `ms`, if it keeps going the way it is. */
export function predictPosition(target: Mover, ms: number): Point {
  return {
    x: target.x + ((target.vx ?? 0) * ms) / 1000,
    y: target.y + ((target.vy ?? 0) * ms) / 1000,
  };
}

/**
 * The dash toward where `target` will be once it lands: refined a few times, since the further the
 * target runs the longer the dash. Lands just short of that spot, never past a full lunge.
 */
export function aimPounce(self: Point, target: Mover) {
  const reach = (point: Point) =>
    Math.min(LUNGE_MAX_DISTANCE, Math.hypot(point.x - self.x, point.y - self.y));
  let landing: Point = target;
  for (let i = 0; i < 3; i++)
    landing = predictPosition(target, (reach(landing) / LUNGE_SPEED) * 1000);
  return {
    angle: Math.atan2(landing.y - self.y, landing.x - self.x),
    ms: (Math.max(0, reach(landing) - NPC_POUNCE_STOP_SHORT) / LUNGE_SPEED) * 1000,
  };
}
