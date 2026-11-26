import type { Player } from "@/client/views/player";
import { feetOffsetOf } from "@/client/views/feet";

/** A hole a body leaves in the mist as it moves, which drifts on, turns, widens and fills back in. */
interface Swirl {
  x: number;
  y: number;
  /** The way it was going, px/s, which the hole keeps drifting a little. */
  vx: number;
  vy: number;
  born: number;
  /** Which way it turns, and where on its little circle it starts. */
  spin: number;
  phase: number;
  /** The body's size, so big things part more mist. */
  size: number;
}

/** How long a hole takes to fill back in, ms. */
const SWIRL_MS = 1600;
/** How often a moving body leaves a hole, ms. */
const SWIRL_EVERY_MS = 120;
/** Most holes kept at once; the oldest go first. */
const MAX_SWIRLS = 120;
/** How much of its body's speed a hole keeps drifting at. */
const DRIFT = 0.35;
/** The little circle a hole turns on as it drifts, px. */
const TURN_RADIUS = 7;

let swirls: Swirl[] = [];
const lastLeft = new WeakMap<Player, number>();

/** Forgets every hole, as on a new map. */
export function clearSwirls() {
  swirls = [];
}

/** Leaves a hole behind each body that is moving on the ground, every few frames. */
export function leaveSwirls(bodies: Player[], now: number) {
  for (const body of bodies) {
    if (body.state?.isDead || body.habitat === "air" || !(body.currentSpeed > 0)) continue;
    if (now - (lastLeft.get(body) ?? 0) < SWIRL_EVERY_MS) continue;
    lastLeft.set(body, now);
    const velocity = body.body?.velocity;
    swirls.push({
      x: body.x,
      y: body.y + feetOffsetOf(body),
      vx: velocity?.x ?? 0,
      vy: velocity?.y ?? 0,
      born: now,
      spin: Math.random() < 0.5 ? -1 : 1,
      phase: Math.random() * Math.PI * 2,
      size: (body.profile?.scale || 1) * Math.max(8, body.bodySize ?? 8),
    });
  }
  swirls = swirls.filter((swirl) => now - swirl.born < SWIRL_MS).slice(-MAX_SWIRLS);
}

/**
 * Where each hole is now, how wide and how clear: it drifts on the way its body went, turning on
 * a small circle as it goes (the swirl), widens, and fills back in as it ages.
 */
export function swirlsAt(now: number) {
  return swirls.map((swirl) => {
    const age = (now - swirl.born) / SWIRL_MS;
    const seconds = (now - swirl.born) / 1000;
    const turn = swirl.phase + swirl.spin * age * Math.PI * 1.5;
    return {
      x: swirl.x + swirl.vx * DRIFT * seconds + Math.cos(turn) * TURN_RADIUS * age,
      y: swirl.y + swirl.vy * DRIFT * seconds + Math.sin(turn) * TURN_RADIUS * age * 0.6,
      radius: swirl.size * (2 + age * 2.5),
      clear: (1 - age) ** 1.5,
    };
  });
}

/** Where each body stands, for the small clearing the mist keeps round its feet. */
export function feetOf(bodies: Player[]) {
  return bodies
    .filter((body) => !body.state?.isDead && body.habitat !== "air")
    .map((body) => ({
      x: body.x,
      y: body.y + feetOffsetOf(body),
      radius: (body.profile?.scale || 1) * Math.max(8, body.bodySize ?? 8) * 2.2,
    }));
}
