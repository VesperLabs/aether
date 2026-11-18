import { isSolidTile, worldToTileX, worldToTileY, type TileGrid } from "./tilemap";

/** Is there no solid tile on the straight line from `from` to `to`? Samples every quarter tile. */
export function hasLineOfSight(
  grid: TileGrid,
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.ceil(distance / (Math.min(grid.tileWidth, grid.tileHeight) / 4));
  for (let i = 1; i < steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    if (isSolidTile(grid, worldToTileX(grid, x), worldToTileY(grid, y))) return false;
  }
  return true;
}

/**
 * Could a body of `radius` walk straight from `from` to `to` without catching a wall? Checks the
 * centre line and both shoulders, so a wide body doesn't head for a gap only its centre fits.
 */
export function hasClearWalk(
  grid: TileGrid,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return true;
  const nx = (-(to.y - from.y) / length) * radius;
  const ny = ((to.x - from.x) / length) * radius;
  return [0, 1, -1].every((side) =>
    hasLineOfSight(
      grid,
      { x: from.x + nx * side, y: from.y + ny * side },
      { x: to.x + nx * side, y: to.y + ny * side },
    ),
  );
}
