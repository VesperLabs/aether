import type { Player } from "@/client/views/player";

/** Past this the hero jumps straight to the server's spot: easing across it would look like a slide. */
const SNAP_DISTANCE = 96;
/** How quickly the hero eases in: about two thirds of the way every this many ms. */
const EASE_MS = 40;

/** How far each hero still has to ease, toward where the server put it. */
const pending = new WeakMap<Player, { x: number; y: number }>();

/**
 * The server rejected the hero's position. Small misses ease in over a few frames while input keeps
 * working; large ones snap.
 */
export function correctHeroPosition(hero: Player, x: number, y: number) {
  const dx = x - hero.x;
  const dy = y - hero.y;
  if (Math.hypot(dx, dy) <= SNAP_DISTANCE) {
    pending.set(hero, { x: dx, y: dy });
    return;
  }
  pending.delete(hero);
  hero.body?.reset(x, y);
  hero.setPosition(x, y);
  hero.vx = 0;
  hero.vy = 0;
}

/** Moves the hero part of the way still owed. Runs every frame. */
export function easeHeroCorrection(hero: Player, deltaMs: number) {
  const left = pending.get(hero);
  if (!left) return;
  const done = Math.hypot(left.x, left.y) < 0.5;
  const share = done ? 1 : 1 - Math.exp(-deltaMs / EASE_MS);
  const sx = left.x * share;
  const sy = left.y * share;
  hero.setPosition(hero.x + sx, hero.y + sy);
  if (done) pending.delete(hero);
  else pending.set(hero, { x: left.x - sx, y: left.y - sy });
}
