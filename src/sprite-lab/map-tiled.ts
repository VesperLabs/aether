import { placeStamps, type Stamp, type StampPlacement } from "./map-stamps";
import { autotile, blockedTiles, type TerrainGrid, type WangSet } from "./map-terrain";

interface TiledTileset {
  readonly name: string;
  readonly firstgid: number;
  readonly wangsets?: readonly (WangSet & { name: string })[];
  readonly [key: string]: unknown;
}

/** The parts of a Tiled map JSON this tool reads. */
export interface TiledMap {
  readonly tilesets: readonly TiledTileset[];
  readonly [key: string]: unknown;
}

const GROUND_TILESET = "tileset-grassland";
const COLLIDE_TILESET = "tileset-collide";
/** The collide tileset's second tile is the one the game treats as blocked. */
const BLOCKED_TILE = 1;

export const TILE_LAYERS = ["Ground", "Shadows", "Overlay", "Extras", "Above", "Collide"] as const;
const OBJECT_LAYERS = ["Loots", "Signs", "Doors", "Npcs"] as const;

const findTileset = (template: TiledMap, name: string) => {
  const tileset = template.tilesets.find((candidate) => candidate.name === name);
  if (!tileset) throw new Error(`Template map has no ${name}`);
  return tileset;
};

export const getTerrainWangset = (template: TiledMap): WangSet => {
  const wangset = findTileset(template, GROUND_TILESET).wangsets?.[0];
  if (!wangset) throw new Error(`${GROUND_TILESET} has no terrain set`);
  return wangset;
};

/** Global tile ids for the Ground layer, 0 meaning empty, as Tiled stores them. */
const groundGids = (grid: TerrainGrid, template: TiledMap) => {
  const { firstgid } = findTileset(template, GROUND_TILESET);
  return autotile(grid, getTerrainWangset(template)).map((tile) => tile + firstgid);
};

/** Every tile layer of the map, by the game's layer names. */
export const buildTileLayers = (
  grid: TerrainGrid,
  template: TiledMap,
  placements: readonly StampPlacement[] = [],
  library: readonly Stamp[] = [],
): Record<(typeof TILE_LAYERS)[number], number[]> => {
  const width = grid[0].length - 1;
  const height = grid.length - 1;
  const stamps = placeStamps(width, height, placements, library);
  const blockedGid = findTileset(template, COLLIDE_TILESET).firstgid + BLOCKED_TILE;
  return {
    Ground: groundGids(grid, template),
    Shadows: stamps.Shadows,
    Overlay: stamps.Overlay,
    Extras: stamps.Extras,
    Above: stamps.Above,
    Collide: blockedTiles(grid).map((blocked, index) =>
      blocked || stamps.Collide[index] === blockedGid ? blockedGid : 0,
    ),
  };
};

/** A Tiled map made from a terrain grid and stamps, reusing the template's tilesets and layer names. */
export const buildTiledMap = (
  grid: TerrainGrid,
  template: TiledMap,
  placements: readonly StampPlacement[] = [],
  library: readonly Stamp[] = [],
) => {
  const width = grid[0].length - 1;
  const height = grid.length - 1;
  const data = buildTileLayers(grid, template, placements, library);
  const base = { opacity: 1, visible: true, x: 0, y: 0 };
  const layers = [
    ...TILE_LAYERS.map((name, index) => ({
      ...base,
      id: index + 1,
      name,
      type: "tilelayer",
      width,
      height,
      data: data[name],
      ...(name === "Collide" ? { visible: false } : {}),
    })),
    ...OBJECT_LAYERS.map((name, index) => ({
      ...base,
      id: TILE_LAYERS.length + index + 1,
      name,
      type: "objectgroup",
      draworder: "topdown",
      objects: [],
    })),
  ];
  return {
    ...template,
    width,
    height,
    layers,
    nextlayerid: layers.length + 1,
    nextobjectid: 1,
    properties: undefined,
  };
};
