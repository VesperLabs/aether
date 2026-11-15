import { isInWater, isOutOfMap, type TileGrid, type TileMap } from "./tilemap";

/** Where a body lives: `land` walkers go anywhere, wading slowly; `water` swimmers keep to it; `air` flyers pass over water unslowed. */
export type Habitat = "land" | "water" | "air";

/** Share of walk speed kept while wading through water. Swimmers keep their full speed. */
export const WATER_SPEED_SCALE = 0.5;

/** How fast a body in its spot moves, as a share of its walk speed. */
export function terrainSpeedScale(grid: TileGrid, at: { x: number; y: number }, habitat?: Habitat) {
  return (habitat ?? "land") === "land" && isInWater(grid, at.x, at.y) ? WATER_SPEED_SCALE : 1;
}

const waterMaps = new WeakMap<TileMap, TileMap>();

/** The map with every tile that isn't water made solid, for swimmers. */
function waterOnly(map: TileMap): TileMap {
  let water = waterMaps.get(map);
  if (!water) {
    const { grid } = map;
    water = {
      ...map,
      grid: {
        ...grid,
        solid: grid.solid.map((row, y) => row.map((solid, x) => solid || !grid.water[y][x])),
      },
    };
    waterMaps.set(map, water);
  }
  return water;
}

/**
 * The map an NPC moves on. A swimmer in water treats land as wall; one out of it (knocked onto the
 * bank, or spawned there) moves on the plain map, so it is never stuck inside what counts as a
 * wall for it, and `isOutOfHabitat` sends it home.
 */
export function habitatMap(map: TileMap, at: { x: number; y: number }, habitat: Habitat = "land") {
  return habitat === "water" && isInWater(map.grid, at.x, at.y) ? waterOnly(map) : map;
}

/** Off the map, in a wall, or a swimmer out of the water: somewhere it should head home from. */
export function isOutOfHabitat(map: TileMap, at: { x: number; y: number }, habitat?: Habitat) {
  if (isOutOfMap(map, at.x, at.y)) return true;
  return habitat === "water" && !isInWater(map.grid, at.x, at.y);
}

/** The middle of the nearest water tile within `maxTiles` of the point, or undefined if none. */
export function nearestWater(grid: TileGrid, at: { x: number; y: number }, maxTiles = 3) {
  const tx = Math.floor(at.x / grid.tileWidth);
  const ty = Math.floor(at.y / grid.tileHeight);
  let best: { x: number; y: number; d: number } | undefined;
  for (let dy = -maxTiles; dy <= maxTiles; dy++) {
    for (let dx = -maxTiles; dx <= maxTiles; dx++) {
      if (!grid.water[ty + dy]?.[tx + dx]) continue;
      const d = dx * dx + dy * dy;
      if (!best || d < best.d) best = { x: tx + dx, y: ty + dy, d };
    }
  }
  return (
    best && {
      x: (best.x + 0.5) * grid.tileWidth,
      y: (best.y + 0.5) * grid.tileHeight,
    }
  );
}
