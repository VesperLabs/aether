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
