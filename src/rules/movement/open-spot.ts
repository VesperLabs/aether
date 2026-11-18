import { isOutOfMap, type TileMap } from "./tilemap";

/** How many tiles out from the wanted spot `findOpenSpot` looks. */
const SEARCH_TILES = 6;

/** Does a square body of half-width `radius` centred on (x, y) stay off every wall and the map edge? */
export function bodyFits(map: TileMap, x: number, y: number, radius: number): boolean {
  /* Samples no further apart than half a tile, edges included, so no wall slips between them */
  const tile = Math.min(map.grid.tileWidth, map.grid.tileHeight);
  const steps = Math.max(1, Math.ceil((radius * 2) / (tile / 2)));
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const dx = -radius + (radius * 2 * i) / steps;
      const dy = -radius + (radius * 2 * j) / steps;
      if (isOutOfMap(map, x + dx, y + dy)) return false;
    }
  }
  return true;
}

/**
 * The nearest point to `at` where a body of `radius` fits, trying `at` itself and then tile
 * centres around it, closest first. `at` when nothing near fits.
 */
export function findOpenSpot(
  map: TileMap,
  at: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  if (bodyFits(map, at.x, at.y, radius)) return at;
  const { tileWidth, tileHeight } = map.grid;
  const tileX = Math.floor(at.x / tileWidth);
  const tileY = Math.floor(at.y / tileHeight);
  const spots: { x: number; y: number; distance: number }[] = [];
  for (let dy = -SEARCH_TILES; dy <= SEARCH_TILES; dy++) {
    for (let dx = -SEARCH_TILES; dx <= SEARCH_TILES; dx++) {
      const x = (tileX + dx + 0.5) * tileWidth;
      const y = (tileY + dy + 0.5) * tileHeight;
      spots.push({ x, y, distance: Math.hypot(x - at.x, y - at.y) });
    }
  }
  spots.sort((a, b) => a.distance - b.distance);
  const spot = spots.find(({ x, y }) => bodyFits(map, x, y, radius));
  return spot ? { x: spot.x, y: spot.y } : at;
}
