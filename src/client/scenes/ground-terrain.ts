import type Phaser from "phaser";
import {
  buildTileGrid,
  isInWater,
  isWaterTerrain,
  readTerrainQuarters,
  type TiledMapJson,
  type TileGrid,
} from "@/rules/movement";

/**
 * Each shown map's ground, read once from its Tiled JSON: water by whole tiles as the server reads
 * it, and the painted terrain a quarter tile at a time for splashes and footprints.
 */
const grounds = new WeakMap<
  Phaser.Tilemaps.Tilemap,
  { grid: TileGrid; quarters: (string | undefined)[][] }
>();

/** Reads the ground of a room's map as it is shown. */
export function readMapGround(map: Phaser.Tilemaps.Tilemap, json: TiledMapJson) {
  grounds.set(map, { grid: buildTileGrid(json), quarters: readTerrainQuarters(json) });
}

/** Is the world point on a water tile of the shown map, by the same rule the server uses for wading speed? */
export function isWaterAt(map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) {
  const ground = map && grounds.get(map);
  return !!ground && isInWater(ground.grid, x, y);
}

/**
 * How much of the ground at the world point is painted with a matching terrain, 0 to 1: the tile's
 * four corners blended across it, so a shore runs smooth and diagonal through the tile.
 */
function terrainShareAt(
  map: Phaser.Tilemaps.Tilemap | undefined,
  x: number,
  y: number,
  matches: (terrain: string | undefined) => boolean,
) {
  const ground = map && grounds.get(map);
  if (!ground) return 0;
  const { tileWidth, tileHeight } = ground.grid;
  const tx = Math.floor(x / tileWidth);
  const ty = Math.floor(y / tileHeight);
  const fx = x / tileWidth - tx;
  const fy = y / tileHeight - ty;
  const corner = (dx: number, dy: number) =>
    matches(ground.quarters[ty * 2 + dy]?.[tx * 2 + dx]) ? 1 : 0;
  const top = corner(0, 0) * (1 - fx) + corner(1, 0) * fx;
  const bottom = corner(0, 1) * (1 - fx) + corner(1, 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Is the world point on painted water, down to the water side of a shore tile? Where feet splash. */
export const isShallowAt = (map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) =>
  terrainShareAt(map, x, y, isWaterTerrain) > 0.5;

/** Terrains drawn as snow in winter art: grass is snowed over, and snow is snow. */
const SNOWY_TERRAINS = new Set(["Grass", "Dark Grass", "Snow"]);

/** Is the world point on ground that is snowy when the map shows winter? Where feet leave prints. */
export const isSnowyAt = (map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) =>
  terrainShareAt(map, x, y, (terrain) => terrain !== undefined && SNOWY_TERRAINS.has(terrain)) >
  0.5;

/** Is the world point on painted sand, in any season? Where feet leave prints too. */
export const isSandyAt = (map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) =>
  terrainShareAt(map, x, y, (terrain) => terrain === "Desert") > 0.5;
