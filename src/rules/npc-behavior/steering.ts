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
