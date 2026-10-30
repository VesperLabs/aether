import { boxHitsTiles } from "./collision";
import type { TileGrid } from "./tilemap";

/**
 * How a player's reported positions are checked on the server. The client moves its own hero and
 * only reports where it is, so every report must be plausible for the player's walk speed.
 *
 * Distance is paid for from a budget that refills with time, so lag spikes followed by a burst of
 * updates (and throttled updates) are fine, but speed hacks and teleports are not.
 */

/** Speed buffs lag a tick behind, and old clients do not normalise diagonals (about 1.41x). */
export const MOVE_SPEED_TOLERANCE = 1.5;
/** The most movement that may be saved up, in seconds of walking: covers lag spikes and bursts. */
export const MOVE_BURST_SECONDS = 1;
/** Extra pixels allowed on every move, for rounding (the client sends whole pixels) and jitter. */
export const MOVE_SLACK_PIXELS = 16;
/** The player's wall box is this much smaller than the body on each side. The client rounds. */
export const MOVE_WALL_INSET = 4;

/** The last accepted position of a player, and how far they may still move. Plain data. */
export interface MoveTrack {
  roomName: string;
  x: number;
  y: number;
  /** When the budget was last refilled, in ms. */
  at: number;
  /** Pixels the player may still move right now. */
  budget: number;
  /** Extra pixels granted by the server (a dodge roll), spent before the budget and never capped. */
  bonus?: number;
}

export interface MoveContext {
  grid: TileGrid;
  bounds: { width: number; height: number };
  walkSpeed: number;
  /** Radius of the player's body. */
  bodySize: number;
}

export type MoveRejection = "invalid" | "out-of-bounds" | "too-far" | "in-wall";

export type MoveResult =
  | { ok: true; track: MoveTrack }
  | { ok: false; reason: MoveRejection; track: MoveTrack };

const maxBudget = (walkSpeed: number) =>
  walkSpeed * MOVE_SPEED_TOLERANCE * MOVE_BURST_SECONDS + MOVE_SLACK_PIXELS;

/** Starts tracking a player at a position the server trusts, with a full budget. */
export function startMoveTrack(
  roomName: string,
  x: number,
  y: number,
  now: number,
  walkSpeed: number,
): MoveTrack {
  return { roomName, x, y, at: now, budget: maxBudget(walkSpeed) };
}

function bodyBox(ctx: MoveContext, x: number, y: number) {
  const half = Math.max(ctx.bodySize - MOVE_WALL_INSET, 1);
  /* Centred on the position, like the client's Arcade body and the server's own movement. */
  return { x, y, halfWidth: half, halfHeight: half };
}

/** True when the body is in a wall anywhere along the straight line between the two points. */
function lineHitsWall(ctx: MoveContext, from: { x: number; y: number }, to: typeof from) {
  const step = Math.max(Math.min(ctx.grid.tileWidth, ctx.grid.tileHeight) / 2, 1);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.ceil(distance / step);
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (boxHitsTiles(ctx.grid, bodyBox(ctx, x, y))) return true;
  }
  return false;
}

/**
 * True when every way the client could have got between the points hits a wall. The client slides
 * along walls one axis at a time, so around a corner it takes an L-shaped path, not a straight one.
 */
function pathHitsWall(ctx: MoveContext, from: { x: number; y: number }, to: typeof from) {
  if (!lineHitsWall(ctx, from, to)) return false;
  const xFirst = { x: to.x, y: from.y };
  if (!lineHitsWall(ctx, from, xFirst) && !lineHitsWall(ctx, xFirst, to)) return false;
  const yFirst = { x: from.x, y: to.y };
  return lineHitsWall(ctx, from, yFirst) || lineHitsWall(ctx, yFirst, to);
}

/**
 * Checks a reported position against the last accepted one. Returns the updated track: moved to
 * the new position when ok, otherwise kept where it was (only the budget refills).
 */
export function checkMove(
  track: MoveTrack,
  to: { x: number; y: number },
  now: number,
  ctx: MoveContext,
): MoveResult {
  const capacity = maxBudget(ctx.walkSpeed);
  const elapsed = Math.max(now - track.at, 0) / 1000;
  const budget = Math.min(track.budget + elapsed * ctx.walkSpeed * MOVE_SPEED_TOLERANCE, capacity);
  const kept: MoveTrack = { ...track, at: now, budget };
  const reject = (reason: MoveRejection): MoveResult => ({
    ok: false,
    reason,
    track: kept,
  });

  if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return reject("invalid");
  if (to.x < 0 || to.y < 0 || to.x > ctx.bounds.width || to.y > ctx.bounds.height) {
    return reject("out-of-bounds");
  }
  const distance = Math.hypot(to.x - track.x, to.y - track.y);
  const bonus = track.bonus ?? 0;
  if (distance > budget + bonus) return reject("too-far");
  /* A player already inside a wall (bad spawn) must be able to walk out of it. */
  const startedInWall = boxHitsTiles(ctx.grid, bodyBox(ctx, track.x, track.y));
  if (!startedInWall && pathHitsWall(ctx, track, to)) return reject("in-wall");

  return {
    ok: true,
    track: {
      ...kept,
      x: to.x,
      y: to.y,
      bonus: Math.max(bonus - distance, 0),
      budget: budget - Math.max(distance - bonus, 0),
    },
  };
}

/** Lets the player move `pixels` further than walking allows, for a server-approved burst. */
export function grantMoveBudget(track: MoveTrack, pixels: number): MoveTrack {
  return { ...track, bonus: (track.bonus ?? 0) + pixels };
}

/** The closest distance from a point to a rectangle (0 when inside it). */
export function distanceToRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/**
 * How close a player must be to a door's trigger area to use it. The client fires `enterDoor` when
 * the body touches the door; this adds room for the body size, the 50ms update throttle and latency.
 */
export const DOOR_USE_RANGE = 64;

export function isWithinDoorRange(
  player: { x: number; y: number; bodyOffsetY: number },
  door: { x: number; y: number; width: number; height: number },
  range = DOOR_USE_RANGE,
): boolean {
  return distanceToRect({ x: player.x, y: player.y + player.bodyOffsetY }, door) <= range;
}
