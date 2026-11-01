import type { Point } from "@/rules/world";

export interface Velocity {
  vx: number;
  vy: number;
}

const ZERO: Velocity = { vx: 0, vy: 0 };

/** Full speed straight at `target`. */
export function seek(self: Point, target: Point, speed: number): Velocity {
  const angle = Math.atan2(target.y - self.y, target.x - self.x);
  return { vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) };
}

/** Full speed straight away from `threat`. */
export function flee(self: Point, threat: Point, speed: number): Velocity {
  const toward = seek(self, threat, speed);
  return { vx: -toward.vx, vy: -toward.vy };
}

/** How far ahead `fleeAround` checks each heading for walls. */
const FLEE_LOOK_AHEAD = 40;
/** Headings `fleeAround` tries, as offsets from straight away, best first. */
const FLEE_OFFSETS = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150].map(
  (degrees) => (degrees * Math.PI) / 180,
);

/** How much `fleeAround` favours the heading it already runs along, against straight away. */
const FLEE_COMMITMENT = 0.8;

/**
 * Away from `threat` like `flee`, but swings toward open ground when straight away runs into a
 * wall, so a fleeing NPC slides along walls and out of corners instead of pinning itself. It
 * prefers to keep running the way it already is (`current`), so it commits to one side of a wall
 * instead of flipping between both. `radius` is the body's half-width, so headings that would clip a corner count as blocked.
 * Falls back to straight away when every heading is blocked.
 */
export function fleeAround(
  self: Point,
  threat: Point,
  speed: number,
  isBlocked: (point: Point) => boolean,
  current: Velocity = ZERO,
  radius = 0,
): Velocity {
  const away = Math.atan2(self.y - threat.y, self.x - threat.x);
  const moving = current.vx !== 0 || current.vy !== 0;
  const heading = Math.atan2(current.vy, current.vx);
  let best: { angle: number; score: number } | undefined;
  for (const offset of FLEE_OFFSETS) {
    const angle = away + offset;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Probe the centre line and both edges of the body, so a heading that would clip a corner
    // with a shoulder counts as blocked.
    const clear = [0.25, 0.5, 1].every((step) =>
      [-radius, 0, radius].every(
        (side) =>
          !isBlocked({
            x: self.x + cos * FLEE_LOOK_AHEAD * step - sin * side,
            y: self.y + sin * FLEE_LOOK_AHEAD * step + cos * side,
          }),
      ),
    );
    if (!clear) continue;
    const score = Math.cos(offset) + (moving ? FLEE_COMMITMENT * Math.cos(angle - heading) : 0);
    if (!best || score > best.score) best = { angle, score };
  }
  if (!best) return flee(self, threat, speed);
  return { vx: speed * Math.cos(best.angle), vy: speed * Math.sin(best.angle) };
}
/**
 * A push away from neighbours closer than `radius`, stronger the closer they are, so a pack spreads
 * out around its target instead of stacking on one spot. Zero when nobody is that close.
 */
export function separate(self: Point, neighbors: Point[], radius: number): Velocity {
  let vx = 0;
  let vy = 0;
  for (const other of neighbors) {
    if (other === self) continue;
    const dx = self.x - other.x;
    const dy = self.y - other.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= radius) continue;
    if (distance === 0) {
      // Exactly on top of each other: nudge along x so they can come apart.
      vx += 1;
      continue;
    }
    const weight = (radius - distance) / radius;
    vx += (dx / distance) * weight;
    vy += (dy / distance) * weight;
  }
  return vx === 0 && vy === 0 ? ZERO : { vx, vy };
}

/** `base` plus `push` scaled to `pushSpeed`, kept at `base`'s speed so crowding never speeds anyone up. */
export function steerWithSeparation(base: Velocity, push: Velocity, pushSpeed: number): Velocity {
  const pushLength = Math.hypot(push.vx, push.vy);
  if (pushLength === 0) return base;
  const speed = Math.hypot(base.vx, base.vy);
  const vx = base.vx + (push.vx / pushLength) * pushSpeed;
  const vy = base.vy + (push.vy / pushLength) * pushSpeed;
  const length = Math.hypot(vx, vy);
  if (length === 0 || speed === 0) return base;
  return { vx: (vx / length) * speed, vy: (vy / length) * speed };
}

/**
 * Sidesteps around `target` at `speed`, drifting back toward `distance` from it, and switches
 * sides when `isBlocked` says a step that way is blocked. Stops if both sides are blocked.
 */
export function strafeAround(
  self: Point,
  target: Point,
  { clockwise, distance, speed }: { clockwise: boolean; distance: number; speed: number },
  isBlocked: (velocity: Velocity) => boolean,
): { velocity: Velocity; clockwise: boolean } {
  const toTarget = Math.atan2(target.y - self.y, target.x - self.x);
  // Positive when too far: lean in. Negative when too close: lean out. Capped at 45 degrees.
  const drift = Math.max(
    -1,
    Math.min(1, (Math.hypot(target.x - self.x, target.y - self.y) - distance) / (distance / 4)),
  );
  const around = (side: boolean) => {
    const angle = toTarget + (side ? 1 : -1) * (Math.PI / 2 - (drift * Math.PI) / 4);
    return { vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) };
  };
  let side = clockwise;
  if (isBlocked(around(side))) side = !side;
  const velocity = isBlocked(around(side)) ? { vx: 0, vy: 0 } : around(side);
  return { velocity, clockwise: side };
}
