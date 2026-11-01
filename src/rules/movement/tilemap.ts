/** A Tiled map as it is stored in the map JSON files. Only the fields the game reads. */
export interface TiledProperty {
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
  tilecount?: number;
  tiles?: Array<{ id: number; properties?: TiledProperty[] }>;
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
}

export interface TileMap {
  grid: TileGrid;
  widthInPixels: number;
  heightInPixels: number;
  /** Object layers by name (`Doors`, `Npcs`, `Loots`, `Signs`). */
  objects: Record<string, TiledObject[]>;
}

/** The layer the server uses for walls. */
export const COLLIDE_LAYER = "Collide";

/* The top bits of a Tiled tile id are flip flags. */
const GID_MASK = 0x1fffffff;

const hasCollidesProperty = (properties: TiledProperty[] | undefined) =>
  !!properties?.some((p) => p.name === "collides" && p.value === true);

/** Which global tile ids are marked `collides: true` in their tileset, as a lookup. */
function collidingGids(tilesets: TiledTileset[]): Set<number> {
  const gids = new Set<number>();
  for (const tileset of tilesets) {
    for (const tile of tileset.tiles ?? []) {
      if (hasCollidesProperty(tile.properties)) gids.add(tileset.firstgid + tile.id);
    }
  }
  return gids;
}

/** Reads the collide layer of a map into a grid of solid tiles. */
export function buildTileGrid(map: TiledMapJson, layerName = COLLIDE_LAYER): TileGrid {
  const layer = map.layers.find((l) => l.name === layerName && l.type === "tilelayer");
  const gids = collidingGids(map.tilesets);
  const solid: boolean[][] = [];
  for (let y = 0; y < map.height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < map.width; x++) {
      const gid = (layer?.data?.[y * map.width + x] ?? 0) & GID_MASK;
      row.push(gid > 0 && gids.has(gid));
    }
    solid.push(row);
  }
  return {
    width: map.width,
    height: map.height,
    tileWidth: map.tilewidth,
    tileHeight: map.tileheight,
    solid,
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

export const worldToTileX = (grid: TileGrid, x: number) => Math.floor(x / grid.tileWidth);
export const worldToTileY = (grid: TileGrid, y: number) => Math.floor(y / grid.tileHeight);

/** Is any of the eight tiles around the one at world point (x, y) solid? */
export function isNextToSolidTile(grid: TileGrid, x: number, y: number): boolean {
  const tileX = worldToTileX(grid, x);
  const tileY = worldToTileY(grid, y);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
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
