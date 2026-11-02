import type { Point, Rng } from "@/rules/world";
import { findDoorstep, type KnownRoom } from "../atlas";
import type { Option } from "../planner";
import type { Senses } from "../senses";

/** Spots closer than this to a live monster are not worth walking to, in pixels. */
const SAFE_DISTANCE = 160;
/** How far from someone (or a sign) a visitor stands, so it doesn't stand on top of them. */
const VISIT_DISTANCE = 40;
/** How many tiles to try before giving up on a random open, safe one. */
const SPOT_TRIES = 50;
/** How far a stroll to a random spot goes, in pixels; further only when nothing near will do. */
const STROLL_RADIUS = 400;
const LINGER_MS = { door: [500, 2500], stroll: [500, 2500], visit: [3000, 7000] } as const;

/**
 * What a wanderer could do here: take a door, go look at a keeper, player or sign, or stroll to
 * an open spot nearby. Never somewhere it can't reach or near a monster. Pure.
 */
export function listOptions(senses: Senses, room: KnownRoom, rng: Rng): Option[] {
  /* Somewhere it can walk to, away from monsters */
  const safe = (p: Point) => room.connects(senses, p) && isSafe(senses, p);

  const doors = Object.values(room.doors).flatMap((door): Option[] => {
    const spot = door.destMap && door.destDoor ? findDoorstep(room, door, senses) : undefined;
    return spot && safe(spot)
      ? [{ kind: "door", label: `take the door to ${door.destMap}`, spot, door }]
      : [];
  });
  const sights = sightsIn(senses, room)
    .filter((s) => safe(s.spot))
    .map((s): Option => ({ kind: "visit", label: `go look at ${s.what}`, spot: s.spot }));

  const near = (p: Point) => Math.hypot(p.x - senses.x, p.y - senses.y) <= STROLL_RADIUS;
  const spot =
    randomOpenSpot(room, rng, (p) => near(p) && safe(p)) ?? randomOpenSpot(room, rng, safe);
  const stroll: Option[] = spot ? [{ kind: "stroll", label: "stroll around", spot }] : [];

  return [...doors, ...sights, ...stroll];
}

/** How long to stay once an option is reached, in milliseconds. */
export function lingerFor({ kind }: Option, rng: Rng) {
  const [min, max] = LINGER_MS[kind];
  return min + rng() * (max - min);
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
