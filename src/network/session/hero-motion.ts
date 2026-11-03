import { moveBox, type Bounds, type MoveResult } from "@/rules/movement/collision";
import type { TileGrid } from "@/rules/movement/tilemap";

/*
 * Moves a hero without Phaser, for headless players (bots). Uses the same stepped, x-then-y tile
 * collision as the server's own movement, with the full body radius as the wall box: the server
 * checks reports with a smaller box (`checkMove`), so every position this returns passes it.
 */

export interface HeroMotionInput {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radius of the hero's body, as `bodySize` in its character data. */
  bodySize: number;
}

/** Where the hero ends up after moving at `vx, vy` for `seconds` through the map's walls. */
export function stepHeroPosition(
  grid: TileGrid,
  bounds: Bounds,
  hero: HeroMotionInput,
  seconds: number,
): MoveResult {
  const half = Math.max(hero.bodySize, 1);
  return moveBox(
    grid,
    bounds,
    { x: hero.x, y: hero.y, halfWidth: half, halfHeight: half },
    { x: hero.vx, y: hero.vy },
    seconds,
  );
}
