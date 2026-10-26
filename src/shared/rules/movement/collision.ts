import { isSolidTile, worldToTileX, worldToTileY, type TileGrid } from "./tilemap";

/** An axis-aligned box, positioned by its centre. */
export interface Box {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface MoveResult {
  x: number;
  y: number;
  /** The box ran into a wall (or the world edge) while moving horizontally. */
  blockedX: boolean;
  /** The box ran into a wall (or the world edge) while moving vertically. */
  blockedY: boolean;
}

/** Physics runs in steps this long, like Phaser Arcade's default 60 steps a second. */
export const PHYSICS_STEP = 1 / 60;

const EPSILON = 1e-6;

/** True when a box overlaps any solid tile. */
export function boxHitsTiles(grid: TileGrid, box: Box): boolean {
  const left = worldToTileX(grid, box.x - box.halfWidth);
  const right = worldToTileX(grid, box.x + box.halfWidth - EPSILON);
  const top = worldToTileY(grid, box.y - box.halfHeight);
  const bottom = worldToTileY(grid, box.y + box.halfHeight - EPSILON);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(grid, tx, ty)) return true;
    }
  }
  return false;
}

/** Moves along one axis; if a solid tile is in the way, the box is pushed back flush against it. */
function moveAxis(grid: TileGrid, box: Box, axis: "x" | "y", delta: number): boolean {
  if (delta === 0) return false;
  box[axis] += delta;
  if (!boxHitsTiles(grid, box)) return false;
  const half = axis === "x" ? box.halfWidth : box.halfHeight;
  const size = axis === "x" ? grid.tileWidth : grid.tileHeight;
  // Snap to the edge of the tile we ran into.
  if (delta > 0) {
    const edge = Math.floor((box[axis] + half - EPSILON) / size) * size;
    box[axis] = edge - half;
  } else {
    const edge = (Math.floor((box[axis] - half) / size) + 1) * size;
    box[axis] = edge + half;
  }
  return true;
}

/** Keeps a box inside the map. The map edge acts as a wall. */
export function clampToBounds(box: Box, bounds: Bounds): { blockedX: boolean; blockedY: boolean } {
  const x = Math.min(Math.max(box.x, box.halfWidth), bounds.width - box.halfWidth);
  const y = Math.min(Math.max(box.y, box.halfHeight), bounds.height - box.halfHeight);
  const result = { blockedX: x !== box.x, blockedY: y !== box.y };
  box.x = x;
  box.y = y;
  return result;
}

/**
 * Moves a box by `velocity * seconds` against the walls and the map edge. Like Phaser Arcade it
 * moves in fixed steps and resolves the x axis before the y axis in each step, so sliding along a
 * wall works. The input box is not changed.
 */
export function moveBox(
  grid: TileGrid,
  bounds: Bounds,
  start: Box,
  velocity: { x: number; y: number },
  seconds: number,
): MoveResult {
  const box = { ...start };
  let blockedX = false;
  let blockedY = false;
  let remaining = seconds;
  while (remaining > 1e-9) {
    const dt = Math.min(PHYSICS_STEP, remaining);
    remaining -= dt;
    if (moveAxis(grid, box, "x", velocity.x * dt)) blockedX = true;
    if (moveAxis(grid, box, "y", velocity.y * dt)) blockedY = true;
    const edge = clampToBounds(box, bounds);
    blockedX ||= edge.blockedX;
    blockedY ||= edge.blockedY;
  }
  return { x: box.x, y: box.y, blockedX, blockedY };
}

/** Plain movement without collision, for things that fly (spells). */
export function integrate(
  position: { x: number; y: number },
  velocity: { x: number; y: number },
  seconds: number,
): { x: number; y: number } {
  return { x: position.x + velocity.x * seconds, y: position.y + velocity.y * seconds };
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy <= reach * reach;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth &&
    Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight
  );
}

export function circleOverlapsBox(circle: Circle, box: Box): boolean {
  const nearestX = Math.min(Math.max(circle.x, box.x - box.halfWidth), box.x + box.halfWidth);
  const nearestY = Math.min(Math.max(circle.y, box.y - box.halfHeight), box.y + box.halfHeight);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

export type Shape = ({ kind: "circle" } & Circle) | ({ kind: "box" } & Box);

/** Do two circles or boxes overlap? */
export function shapesOverlap(a: Shape, b: Shape): boolean {
  if (a.kind === "circle" && b.kind === "circle") return circlesOverlap(a, b);
  if (a.kind === "box" && b.kind === "box") return boxesOverlap(a, b);
  return a.kind === "circle"
    ? circleOverlapsBox(a, b as Box)
    : circleOverlapsBox(b as Circle, a as Box);
}
