import type { TileGrid, TileMap } from "./tilemap";

/** The step it moves in, in seconds: the same as the walkers' physics. */
const STEP = 1 / 60;

/** The walls a ricochet reads: the room's collision grid and its edges. */
type Walls = Pick<TileMap, "grid" | "widthInPixels" | "heightInPixels">;

export interface RicochetBody {
  x: number;
  y: number;
}

export interface RicochetOptions {
  /**
   * How far past a wall's face its middle goes before it turns back, in pixels: it sinks into the
   * wall that far and comes back out. 0 bounces on the face; less than 0, short of it.
   */
  depth: number;
  /**
   * How far below it its ground point is, in pixels: something flying at chest height meets the
   * walls where its shadow is, as the walls are drawn on the ground.
   */
  groundOffset: number;
  /**
   * The share of its speed into a wall it keeps coming back off it, 0 to 1: 1 bounces back as hard
   * as it went in, less loses some to the wall. Its speed along the wall is kept. Default 1.
   */
  bounciness?: number;
}

/**
 * Moves something that banks off walls (a spell with `ricochet`) along its velocity. Each wall face
 * (and the map's edge) is a mirror set `depth` into the wall: crossing one on the way in, it is
 * reflected back off it, and the part of its velocity into the wall turns back, less what the wall
 * takes (`bounciness`). Only the way in reflects, so something already in a wall goes back out
 * freely. Moves `body` in place; returns its velocity after and how far it went, for its range.
 */
export function moveRicocheting(
  walls: Walls,
  body: RicochetBody,
  velocity: { x: number; y: number },
  seconds: number,
  { depth, groundOffset, bounciness = 1 }: RicochetOptions,
) {
  const solid = (tx: number, ty: number) => isWall(walls.grid, tx, ty);
  const { tileWidth, tileHeight } = walls.grid;
  const ground = { x: body.x, y: body.y + groundOffset };
  let { x: vx, y: vy } = velocity;
  let distance = 0;
  /* In small steps, each less than a tile, so it turns back the moment it meets a wall */
  for (let left = seconds; left > 1e-9; left -= STEP) {
    const dt = Math.min(STEP, left);
    distance += Math.hypot(vx, vy) * dt;
    const row = Math.floor(ground.y / tileHeight);
    const x = reflectAxis(ground.x, vx * dt, depth, tileWidth, (col) => solid(col, row));
    ground.x = x.at;
    if (x.bounced) vx = -vx * bounciness;
    const col = Math.floor(ground.x / tileWidth);
    const y = reflectAxis(ground.y, vy * dt, depth, tileHeight, (r) => solid(col, r));
    ground.y = y.at;
    if (y.bounced) vy = -vy * bounciness;
  }
  body.x = ground.x;
  body.y = ground.y - groundOffset;
  return { velocity: { x: vx, y: vy }, distance };
}

/**
 * One axis of one step: moves from `at` by `step`, reflected off the mirror `depth` past a wall's
 * face if it crosses one on the way in. Which tile a point is in is judged `depth` behind it, so
 * that point reaches a solid tile just as the middle reaches the mirror.
 */
function reflectAxis(
  at: number,
  step: number,
  depth: number,
  tileSize: number,
  isSolid: (tile: number) => boolean,
) {
  if (!step) return { at, bounced: false };
  const sign = Math.sign(step);
  const to = at + step;
  const tileBefore = Math.floor((at - sign * depth) / tileSize);
  const tileAfter = Math.floor((to - sign * depth) / tileSize);
  if (tileAfter === tileBefore || isSolid(tileBefore) || !isSolid(tileAfter)) {
    return { at: to, bounced: false };
  }
  /* The face between the two tiles, and the mirror `depth` past it */
  const face = (sign > 0 ? tileAfter : tileAfter + 1) * tileSize;
  const mirror = face + sign * depth;
  return { at: 2 * mirror - to, bounced: true };
}

/** A wall tile, or outside the map: its edge is a wall too. */
function isWall(grid: TileGrid, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= grid.width || ty >= grid.height) return true;
  return grid.solid[ty]?.[tx] === true;
}
