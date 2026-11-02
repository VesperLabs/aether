import type { DoorData } from "@/rules/movement";
import type { Point, Rng } from "@/rules/world";
import { findDoorstep, type KnownRoom } from "../atlas";
import type { Senses } from "../senses";

/** Spots closer than this to a live monster are not worth walking to, in pixels. */
const SAFE_DISTANCE = 160;
/** How far from someone (or a sign) a visitor stands, so it doesn't stand on top of them. */
const VISIT_DISTANCE = 40;
/** How many tiles to try before giving up on a random open, safe one. */
const SPOT_TRIES = 50;
/** How far a stroll to a random spot goes, in pixels; further only when nothing near will do. */
const STROLL_RADIUS = 400;
/** How many rooms a wanderer remembers having been in, most recent last. */
export const ROOM_MEMORY = 4;
/** How much more a wanderer likes a door to somewhere it hasn't been lately. */
const FRESH_DOOR_WEIGHT = 6;
const LINGER_MS = { spot: [500, 2500], visit: [3000, 7000] } as const;

/** One wanderer's temperament, rolled once so bots differ from each other. */
export interface Temperament {
  /** Share of walking speed: strollers dawdle, others hurry. */
  pace: number;
  /** How often it heads over to a keeper, player or sign. */
  curiosity: number;
  /** How likely it leaves the room after each goal; it grows bored the longer it stays. */
  restlessness: number;
}

export function rollTemperament(rng: Rng): Temperament {
  return {
    pace: 0.5 + rng() * 0.5,
    curiosity: 0.2 + rng() * 0.4,
    restlessness: 0.15 + rng() * 0.3,
  };
}

/** Where a wanderer heads next, and how long it stays once there. */
export type Goal =
  | { kind: "door"; spot: Point; door: DoorData; lingerMs: number }
  | { kind: "visit"; spot: Point; what: string; lingerMs: number }
  | { kind: "spot"; spot: Point; lingerMs: number };

/** What a wanderer remembers between goals. */
export interface WanderMemory {
  /** Rooms it has been in lately, most recent last. */
  recentRooms: string[];
  /** Goals it has reached in this room so far. */
  goalsHere: number;
}

/**
 * Picks the next goal: a door more and more likely the longer it stays, favouring rooms not seen
 * lately; sometimes a keeper, player or sign to look at; otherwise a stroll to an open spot
 * nearby. Never somewhere it can't reach or near a monster. Pure.
 */
export function pickGoal(
  senses: Senses,
  room: KnownRoom,
  { temperament, memory, rng }: { temperament: Temperament; memory: WanderMemory; rng: Rng },
): Goal | undefined {
  /* Somewhere it can walk to, away from monsters */
  const safe = (p: Point) => room.connects(senses, p) && isSafe(senses, p);
  const linger = (kind: keyof typeof LINGER_MS) => {
    const [min, max] = LINGER_MS[kind];
    return min + rng() * (max - min);
  };

  const leaveChance = 1 - (1 - temperament.restlessness) ** (memory.goalsHere + 1);
  if (rng() < leaveChance) {
    const doors = Object.values(room.doors).flatMap((door) => {
      const spot = door.destMap && door.destDoor ? findDoorstep(room, door, senses) : undefined;
      if (!spot || !safe(spot)) return [];
      const weight = memory.recentRooms.includes(door.destMap!) ? 1 : FRESH_DOOR_WEIGHT;
      return [{ value: { door, spot }, weight }];
    });
    const chosen = pickWeighted(doors, rng);
    if (chosen) return { kind: "door", ...chosen, lingerMs: linger("spot") };
  }

  if (rng() < temperament.curiosity) {
    const sights = sightsIn(senses, room).filter((s) => safe(s.spot));
    if (sights.length) {
      const { what, spot } = sights[Math.floor(rng() * sights.length)];
      return { kind: "visit", what, spot, lingerMs: linger("visit") };
    }
  }

  const near = (p: Point) => Math.hypot(p.x - senses.x, p.y - senses.y) <= STROLL_RADIUS;
  const spot =
    randomOpenSpot(room, rng, (p) => near(p) && safe(p)) ?? randomOpenSpot(room, rng, safe);
  return spot ? { kind: "spot", spot, lingerMs: linger("spot") } : undefined;
}

/** Keepers, other players and signs in the room, each with a spot to look at it from. */
function sightsIn(senses: Senses, room: KnownRoom) {
  const people = [...senses.characters.values()]
    .filter((c) => c.id !== senses.selfId && !c.isDead && !c.isHostile)
    .map((c) => ({ what: c.name, at: { x: c.x, y: c.y } }));
  const signs = (room.map.objects.Signs ?? []).map((s) => ({
    what: `sign ${s.name}`,
    at: { x: s.x, y: s.y },
  }));
  return [...people, ...signs].map((s) => ({ ...s, spot: besideFrom(s.at, senses) }));
}

/** A spot `VISIT_DISTANCE` short of `target`, on the side the bot comes from. */
function besideFrom(target: Point, from: Point): Point {
  const distance = Math.hypot(from.x - target.x, from.y - target.y) || 1;
  const reach = Math.min(VISIT_DISTANCE, distance);
  return {
    x: target.x + ((from.x - target.x) / distance) * reach,
    y: target.y + ((from.y - target.y) / distance) * reach,
  };
}

function isSafe(senses: Senses, point: Point) {
  for (const c of senses.characters.values()) {
    if (c.isHostile && !c.isDead && Math.hypot(c.x - point.x, c.y - point.y) < SAFE_DISTANCE) {
      return false;
    }
  }
  return true;
}

/** The centre of a random open tile that passes `accept`, if one turns up. */
function randomOpenSpot({ map: { grid } }: KnownRoom, rng: Rng, accept: (p: Point) => boolean) {
  for (let i = 0; i < SPOT_TRIES; i++) {
    const x = Math.floor(rng() * grid.width);
    const y = Math.floor(rng() * grid.height);
    const spot = { x: (x + 0.5) * grid.tileWidth, y: (y + 0.5) * grid.tileHeight };
    if (!grid.solid[y][x] && accept(spot)) return spot;
  }
  return undefined;
}

function pickWeighted<T>(options: { value: T; weight: number }[], rng: Rng): T | undefined {
  let roll = rng() * options.reduce((sum, o) => sum + o.weight, 0);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.value;
  }
  return undefined;
}
