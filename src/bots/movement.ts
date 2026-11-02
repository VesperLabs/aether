import { encodeWireDirection } from "@/network";
import { findPath, type AvoidZone } from "@/rules/movement";
import type { Point } from "@/rules/world";
import type { KnownRoom } from "./atlas";
import type { BotBody } from "./body";

/** How often a walking bot reports its position, like a client on a 20 fps network tick. */
const STEP_MS = 50;
/** Bots walk a little under their speed so the server's speed check never trips on timing. */
const SPEED_MARGIN = 0.85;
/** How close counts as having arrived, in pixels. */
const ARRIVE_DISTANCE = 4;
const DEFAULT_WALK_SPEED = 100;
/** How many times a traveller finds a new path after the server stops it short. */
const MAX_TRIES = 3;
/** How wide a berth a traveller avoiding mobs gives each one, in pixels. */
const MOB_BERTH = 96;

export interface WalkOptions {
  timeoutMs?: number;
  /** Share of walking speed, 0 to 1: a stroll is slower than a hurry. */
  pace?: number;
}

export interface TravelOptions extends WalkOptions {
  /** Route around live monsters instead of walking past them. */
  avoidMobs?: boolean;
}

/**
 * Walks in a straight line at walking speed, reporting each step like a client. Stops early when
 * the server corrects it (a wall, the map edge). Resolves with whether it got there.
 */
export function walkTo(body: BotBody, x: number, y: number, options: WalkOptions) {
  return walkPath(body, [{ x, y }], options);
}

/**
 * Walks through each point in turn without stopping in between, like `walkTo`. Resolves with
 * whether it reached the last one.
 */
async function walkPath(
  body: BotBody,
  points: Point[],
  { timeoutMs = 15000, pace = 1 }: WalkOptions,
) {
  const { senses, clock, link } = body;
  const correctionsBefore = senses.corrections.length;
  const corrected = () => senses.corrections.length > correctionsBefore;
  const speed = (senses.hero?.stats?.walkSpeed ?? DEFAULT_WALK_SPEED) * Math.min(pace, 1);
  const step = (speed * SPEED_MARGIN * STEP_MS) / 1000;
  const deadline = clock.now() + timeoutMs;
  let next = 0;
  while (next < points.length && clock.now() < deadline && !corrected() && !senses.isDead) {
    const { x, y } = points[next];
    const dx = x - senses.x;
    const dy = y - senses.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= ARRIVE_DISTANCE) {
      next++;
      continue;
    }
    const move = Math.min(step, distance);
    senses.x += (dx / distance) * move;
    senses.y += (dy / distance) * move;
    link.send("playerInput", {
      x: senses.x,
      y: senses.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      d: encodeWireDirection(facing(dx, dy)),
      roomName: senses.roomName,
    });
    await clock.sleep(STEP_MS);
  }
  sendPosition(body, senses.x, senses.y);
  await body.sync();
  const last = points[points.length - 1];
  return !corrected() && Math.hypot(last.x - senses.x, last.y - senses.y) <= ARRIVE_DISTANCE;
}

/**
 * Walks around walls to a spot in the room, finding the way with the game's own pathfinder.
 * Resolves with whether it got there.
 */
export async function travelTo(
  body: BotBody,
  room: KnownRoom,
  to: Point,
  { timeoutMs = 30000, pace, avoidMobs = false }: TravelOptions,
) {
  const { senses, clock } = body;
  const deadline = clock.now() + timeoutMs;
  for (let tries = 0; tries < MAX_TRIES && clock.now() < deadline; tries++) {
    /* Mobs move, so each try routes around where they are now */
    const avoid = avoidMobs ? mobZones(body) : [];
    const path = findPath(room.pathfinder, senses, to, avoid);
    if (!path) return false;
    /* Tile centres along the way, then the exact spot */
    const points = [...path.slice(0, -1), to];
    if (await walkPath(body, points, { timeoutMs: deadline - clock.now(), pace })) return true;
  }
  return false;
}

/** The space around every live monster the bot can see. */
function mobZones({ senses }: BotBody): AvoidZone[] {
  return [...senses.characters.values()]
    .filter((c) => c.isHostile && !c.isDead)
    .map(({ x, y }) => ({ x, y, radius: MOB_BERTH }));
}

/** Reports standing at a position, legal or not; the server decides. */
export function sendPosition({ link }: BotBody, x: number, y: number) {
  link.send("playerInput", { x, y, vx: 0, vy: 0 });
}

/** The four-way facing the game uses for a movement or aim vector. */
export function facing(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
