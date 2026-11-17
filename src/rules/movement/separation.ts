/** Soft collision between characters: overlapping bodies ease apart over a few ticks instead of blocking. */

/** How much wider than its feet a body keeps others off, so crowds read as separate bodies. */
const SEPARATION_GAP = 2;

/** The radius a body keeps others out of: its feet (`bodySize`, already scaled) plus a gap. */
export const separationRadius = (bodySize: number) => bodySize + SEPARATION_GAP;

/** The radius of a body that doesn't say: a human's feet at scale 1, plus the gap. */
export const BODY_RADIUS = separationRadius(8);

/**
 * Share of an overlap undone each tick. Below 1 so crowds settle smoothly instead of snapping and
 * jittering; the rest is undone on the next ticks.
 */
const SEPARATION_STIFFNESS = 0.4;

/** Most a body is pushed in one tick, so a dense pile spreads out instead of exploding. */
const MAX_PUSH_PER_TICK = 4;

/**
 * Fastest a pushed NPC moves, in pixels per second. Well under walk speed, so a player walks past
 * a mob that eases aside instead of bulldozing it across the map.
 */
export const MAX_PUSH_SPEED = 30;

export interface SeparatingBody {
  id: string;
  x: number;
  y: number;
  /** How far it keeps others off (`separationRadius`); the `radius` passed in when unset. */
  radius?: number;
}

export interface Neighbour extends SeparatingBody {
  /** True when the neighbour never moves aside (a player), so this body takes the whole overlap. */
  isFixed?: boolean;
}

/**
 * How far `body` should move to ease out of the neighbours it overlaps. Between two movable bodies
 * each takes half the overlap; against a fixed one it takes all of it. Bodies on the exact same
 * spot split along x by id, so the result stays deterministic. Two bodies touch at the sum of their
 * radii, so a big body keeps small ones further off.
 */
export function getSeparationPush(
  body: SeparatingBody,
  neighbours: Iterable<Neighbour>,
  radius = BODY_RADIUS,
  maxPush = MAX_PUSH_PER_TICK,
): { x: number; y: number } {
  const own = body.radius ?? radius;
  let pushX = 0;
  let pushY = 0;
  for (const other of neighbours) {
    if (other.id === body.id) continue;
    const dx = body.x - other.x;
    const dy = body.y - other.y;
    const distanceSquared = dx * dx + dy * dy;
    const reach = own + (other.radius ?? radius);
    if (distanceSquared >= reach * reach) continue;
    const share = other.isFixed ? 1 : 0.5;
    const distance = Math.sqrt(distanceSquared);
    const overlap = (reach - distance) * share;
    if (distance > 1e-6) {
      pushX += (dx / distance) * overlap;
      pushY += (dy / distance) * overlap;
    } else {
      pushX += body.id < other.id ? -overlap : overlap;
    }
  }
  pushX *= SEPARATION_STIFFNESS;
  pushY *= SEPARATION_STIFFNESS;
  const length = Math.hypot(pushX, pushY);
  if (length <= maxPush) return { x: pushX, y: pushY };
  const scale = maxPush / length;
  return { x: pushX * scale, y: pushY * scale };
}

/** Share of walk speed a crowd can push a player with: enough to feel, well within move validation. */
const PLAYER_PUSH_SPEED_SCALE = 0.18;

/**
 * Velocity that eases a player out of the characters around them. Players only drift, never stop:
 * the push tops out at a fraction of walk speed, and the part of it against `walk` is dropped, so
 * walking into a crowd slides around it at full speed instead of wading through.
 */
export function getSeparationVelocity(
  body: SeparatingBody,
  neighbours: Iterable<Neighbour>,
  walkSpeed: number,
  walk: { x: number; y: number } = { x: 0, y: 0 },
  radius = BODY_RADIUS,
): { x: number; y: number } {
  const push = getSeparationPush(body, neighbours, radius);
  const scale = (walkSpeed * PLAYER_PUSH_SPEED_SCALE) / MAX_PUSH_PER_TICK;
  let x = push.x * scale;
  let y = push.y * scale;
  const walkLength = Math.hypot(walk.x, walk.y);
  if (walkLength) {
    const along = (x * walk.x + y * walk.y) / walkLength;
    if (along < 0) {
      x -= (along * walk.x) / walkLength;
      y -= (along * walk.y) / walkLength;
    }
  }
  return { x, y };
}
