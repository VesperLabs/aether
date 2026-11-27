import { readIceQuarters, readWaterTiles, type TiledWangSet } from "./terrain-corners";

/** A Tiled map as it is stored in the map JSON files. Only the fields the game reads. */
interface TiledProperty {
  name: string;
  value: unknown;
}

export interface TiledObject {
  id?: number;
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  objects?: TiledObject[];
}

interface TiledTileset {
  firstgid: number;
  /** A shared tileset file, before `inlineTilesets` puts it in the map. */
  source?: string;
  tilecount?: number;
  tiles?: Array<{ id: number; properties?: TiledProperty[] }>;
  wangsets?: TiledWangSet[];
}

export interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

/** The tiles that block movement, row by row. Plain data. */
export interface TileGrid {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  /** `solid[y][x]` is true when the tile blocks movement. */
  solid: boolean[][];
  /**
   * `water[y][x]` is true on a tile painted water on all four corners (`water-corners`): walkable,
   * but slow and only half out of it. Shore tiles are dry.
   */
  water: boolean[][];
  /** `ice[qy][qx]` is true on a quarter tile painted ice: bodies slide on it. */
  ice?: boolean[][];
}

export interface TileMap {
  grid: TileGrid;
  widthInPixels: number;
  heightInPixels: number;
  /** Object layers by name (`Doors`, `Npcs`, `Loots`, `Signs`). */
  objects: Record<string, TiledObject[]>;
}

/** The layer the server uses for walls. */
const COLLIDE_LAYER = "Collide";

/* The top bits of a Tiled tile id are flip flags. */
const GID_MASK = 0x1fffffff;

const hasTrueProperty = (properties: TiledProperty[] | undefined, name: string) =>
  !!properties?.some((p) => p.name === name && p.value === true);

/** Which global tile ids have the bool property `name` set in their tileset, as a lookup. */
function gidsWith(tilesets: TiledTileset[], name: string): Set<number> {
  const gids = new Set<number>();
  for (const tileset of tilesets) {
    for (const tile of tileset.tiles ?? []) {
      if (hasTrueProperty(tile.properties, name)) gids.add(tileset.firstgid + tile.id);
    }
  }
  return gids;
}

/** Reads a map's walls (`collides` tiles on the collide layer) and its painted water and ice. */
export function buildTileGrid(map: TiledMapJson, layerName = COLLIDE_LAYER): TileGrid {
  const layer = map.layers.find((l) => l.name === layerName && l.type === "tilelayer");
  const solidGids = gidsWith(map.tilesets, "collides");
  const solid: boolean[][] = [];
  for (let y = 0; y < map.height; y++) {
    const solidRow: boolean[] = [];
    for (let x = 0; x < map.width; x++) {
      const gid = (layer?.data?.[y * map.width + x] ?? 0) & GID_MASK;
      solidRow.push(gid > 0 && solidGids.has(gid));
    }
    solid.push(solidRow);
  }
  return {
    width: map.width,
    height: map.height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    solid,
    water: readWaterTiles(map),
    ice: readIceQuarters(map),
  };
}

/** Collision grid, size and object layers of a Tiled map. */
export function readTileMap(map: TiledMapJson): TileMap {
  const objects: Record<string, TiledObject[]> = {};
  for (const layer of map.layers) {
    if (layer.type === "objectgroup") objects[layer.name] = layer.objects ?? [];
  }
  return {
    grid: buildTileGrid(map),
    widthInPixels: map.width * map.tilewidth,
    heightInPixels: map.height * map.tileheight,
    objects,
  };
}

/** Value of a named Tiled object property. */
export function getObjectProperty<T = unknown>(object: TiledObject, name: string): T | undefined {
  return object.properties?.find((p) => p.name === name)?.value as T | undefined;
}

/** True when the tile at this tile position blocks movement. Outside the map nothing is solid. */
export function isSolidTile(grid: TileGrid, tileX: number, tileY: number): boolean {
  return grid.solid[tileY]?.[tileX] === true;
}

/** True when the tile at this tile position is water. */
function isWaterTile(grid: TileGrid, tileX: number, tileY: number): boolean {
  return grid.water[tileY]?.[tileX] === true;
}

/** Is the world point (x, y) on a water tile? */
export function isInWater(grid: TileGrid, x: number, y: number): boolean {
  return isWaterTile(grid, worldToTileX(grid, x), worldToTileY(grid, y));
}

export const worldToTileX = (grid: TileGrid, x: number) => Math.floor(x / grid.tileWidth);
export const worldToTileY = (grid: TileGrid, y: number) => Math.floor(y / grid.tileHeight);

/**
 * Is any tile around the one at world point (x, y) solid? Looks one tile out, plus however far a
 * body of `radius` reaches past its own tile.
 */
export function isNextToSolidTile(grid: TileGrid, x: number, y: number, radius = 0): boolean {
  const tileX = worldToTileX(grid, x);
  const tileY = worldToTileY(grid, y);
  const reach = 1 + Math.max(0, Math.ceil((radius - grid.tileWidth / 2) / grid.tileWidth));
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dy = -reach; dy <= reach; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (isSolidTile(grid, tileX + dx, tileY + dy)) return true;
    }
  }
  return false;
}

/** Is the world point (x, y) off the map or inside a solid tile? */
export function isOutOfMap(map: TileMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.widthInPixels || y >= map.heightInPixels) return true;
  return isSolidTile(map.grid, worldToTileX(map.grid, x), worldToTileY(map.grid, y));
}

/** Is the world point (x, y) on an ice tile? */
export function isOnIce(grid: TileGrid, x: number, y: number): boolean {
  const qx = Math.floor((x * 2) / grid.tileWidth);
  const qy = Math.floor((y * 2) / grid.tileHeight);
  return grid.ice?.[qy]?.[qx] === true;
}
