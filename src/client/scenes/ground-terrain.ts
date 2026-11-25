import type Phaser from "phaser";
import {
  buildTileGrid,
  isInWater,
  isWaterTerrain,
  readTerrainQuarters,
  type TiledMapJson,
  type TileGrid,
} from "@/rules/movement";
import { pixelsOf } from "./tile-pixels";

/**
 * Each shown map's ground, read once from its Tiled JSON: water by whole tiles as the server reads
 * it, and the painted terrain a quarter tile at a time for splashes and footprints.
 */
const grounds = new WeakMap<
  Phaser.Tilemaps.Tilemap,
  { grid: TileGrid; quarters: (string | undefined)[][]; hayGids: Set<number> }
>();

/** Layers hay can be painted on, under bodies. */
const HAY_LAYERS = ["Props 3", "Props 2", "Props 1", "Overlay", "Ground"];

/** Global ids of the tiles painted with the `Hay` terrain on any corner. */
function hayGidsOf(json: TiledMapJson) {
  const gids = new Set<number>();
  for (const tileset of json.tilesets) {
    const set = tileset.wangsets?.find((wangset) => wangset.name === "Terrains");
    const hay = (set?.colors.findIndex((color) => color.name === "Hay") ?? -1) + 1;
    if (!hay) continue;
    for (const tile of set?.wangtiles ?? []) {
      if (tile.wangid.includes(hay)) gids.add(tileset.firstgid + tile.tileid);
    }
  }
  return gids;
}

/** Reads the ground of a room's map as it is shown. */
export function readMapGround(map: Phaser.Tilemaps.Tilemap, json: TiledMapJson) {
  grounds.set(map, {
    grid: buildTileGrid(json),
    quarters: readTerrainQuarters(json),
    hayGids: hayGidsOf(json),
  });
}

/**
 * The walls of a shown map, as the server reads them: for a spell that banks off them
 * (`ricochet`) to follow the same path on screen.
 */
export function wallsOf(map: Phaser.Tilemaps.Tilemap | undefined) {
  const ground = map && grounds.get(map);
  if (!ground) return undefined;
  return {
    grid: ground.grid,
    widthInPixels: map.widthInPixels,
    heightInPixels: map.heightInPixels,
  };
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

/** The hay art's color at the world pixel (0xrrggbb), or undefined where none is drawn. */
function hayPixel(map: Phaser.Tilemaps.Tilemap, hayGids: Set<number>, x: number, y: number) {
  for (const name of HAY_LAYERS) {
    if (!map.getLayer(name)) continue;
    const tile = map.getTileAtWorldXY(x, y, false, undefined, name);
    if (!tile || !hayGids.has(tile.index) || !tile.tileset) continue;
    const { data, width } = pixelsOf(tile.tileset.image as Phaser.Textures.Texture);
    const at = tile.tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number };
    const i =
      ((at.y + Math.floor(y - tile.pixelY)) * width + at.x + Math.floor(x - tile.pixelX)) * 4;
    if (data[i + 3] > 0) return (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  }
  return undefined;
}

/** The hay art's color at the world pixel on the shown map, or undefined where there is none. */
export function hayColorAt(map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) {
  const ground = map && grounds.get(map);
  return map && ground?.hayGids.size ? hayPixel(map, ground.hayGids, x, y) : undefined;
}

/**
 * How deep in hay feet at the world point are, 0 to 1: how far they are inside the hay art, up
 * and down, out of `rise` px. It starts the moment the feet touch the hay's drawn edge, from
 * whichever side they come in.
 */
export function hayDepthAt(
  map: Phaser.Tilemaps.Tilemap | undefined,
  x: number,
  y: number,
  rise: number,
  /** Px into the hay before it starts, so stalks never stand out past its drawn edge. */
  edge: number,
) {
  const ground = map && grounds.get(map);
  if (!map || !ground?.hayGids.size) return 0;
  const inHay = (dy: number) => hayPixel(map, ground.hayGids, x, y + dy) !== undefined;
  const reach = edge + rise;
  let up = 0;
  while (up < reach && inHay(-up)) up++;
  if (up <= edge) return 0;
  let down = 1;
  while (down < reach && inHay(down)) down++;
  return Math.max(0, Math.min(up, down) - edge) / rise;
}

/** Is the world point on painted sand, in any season? Where feet leave prints too. */
export const isSandyAt = (map: Phaser.Tilemaps.Tilemap | undefined, x: number, y: number) =>
  terrainShareAt(map, x, y, (terrain) => terrain === "Desert") > 0.5;
