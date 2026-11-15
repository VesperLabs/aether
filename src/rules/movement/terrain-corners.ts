/**
 * Terrain as the ground is painted. Tilesets carry a Tiled corner terrain set (`Terrains`): each
 * terrain tile names the terrain on its four corners, so a shore tile is part water and part land.
 * A tile is water when all four of its corners are; a shore tile's water corners are only shallows,
 * for splashes. Nothing is marked by hand.
 */

/** The corner terrain set the tilesets paint ground with, by its Tiled name. */
const TERRAIN_SET = "Terrains";
/** Terrains a body wades or swims in. Frozen water is walked on, like ice. */
const WATER_TERRAINS = new Set(["Water", "Deep Water"]);

/** Is this painted terrain water? */
export const isWaterTerrain = (terrain: string | undefined) =>
  terrain !== undefined && WATER_TERRAINS.has(terrain);
/**
 * Drawn layers under bodies, topmost first. The topmost terrain tile at a spot decides; tiles with
 * no terrain (rocks, cattails, a waterfall's sides) are see-through, except a `bridge` tile, which
 * makes the spot dry.
 */
const TERRAIN_LAYERS = ["Extras", "Overlay", "Ground"];
/** A Tiled wang id lists the edges and corners clockwise from the top; these are the corners. */
const TOP_LEFT = 7;
const TOP_RIGHT = 1;
const BOTTOM_LEFT = 5;
const BOTTOM_RIGHT = 3;

/* The top bits of a Tiled tile id are flip flags. */
const GID_MASK = 0x1fffffff;

export interface TiledWangSet {
  name: string;
  colors: { name: string }[];
  wangtiles: { tileid: number; wangid: number[] }[];
}

interface TerrainSource {
  width: number;
  height: number;
  layers: { name: string; type: string; data?: number[] }[];
  tilesets: {
    firstgid: number;
    wangsets?: TiledWangSet[];
    tiles?: { id: number; properties?: { name: string; value: unknown }[] }[];
  }[];
}

/** Global ids of the tiles a body crosses water on (`bridge` in their tileset). */
function bridgeGids(tilesets: TerrainSource["tilesets"]) {
  return new Set(
    tilesets.flatMap((tileset) =>
      (tileset.tiles ?? [])
        .filter((tile) => tile.properties?.some((p) => p.name === "bridge" && p.value === true))
        .map((tile) => tileset.firstgid + tile.id),
    ),
  );
}

/** Each global tile id with terrain, and the terrain on its corners (TL, TR, BL, BR). */
function cornersByGid(tilesets: TerrainSource["tilesets"]) {
  const corners = new Map<number, (string | undefined)[]>();
  for (const tileset of tilesets) {
    const set = tileset.wangsets?.find((wangset) => wangset.name === TERRAIN_SET);
    for (const tile of set?.wangtiles ?? []) {
      corners.set(
        tileset.firstgid + tile.tileid,
        [TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT].map(
          (corner) => set?.colors[tile.wangid[corner] - 1]?.name,
        ),
      );
    }
  }
  return corners;
}

/** Each tile's corner terrains (TL, TR, BL, BR) from its topmost terrain tile; none on a bridge. */
function readCorners(map: TerrainSource) {
  const cornersOf = cornersByGid(map.tilesets);
  const bridges = bridgeGids(map.tilesets);
  const layers = TERRAIN_LAYERS.flatMap((name) =>
    map.layers.filter((layer) => layer.name === name && layer.type === "tilelayer"),
  );
  return (x: number, y: number) => {
    const i = y * map.width + x;
    const gids = layers.map((layer) => (layer.data?.[i] ?? 0) & GID_MASK);
    if (gids.some((gid) => bridges.has(gid))) return undefined;
    return gids.map((gid) => cornersOf.get(gid)).find(Boolean);
  };
}

/** `water[y][x]`: is the tile painted water on all four corners? */
export function readWaterTiles(map: TerrainSource): boolean[][] {
  const cornersAt = readCorners(map);
  return Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => cornersAt(x, y)?.every(isWaterTerrain) === true),
  );
}

/**
 * The painted terrain a quarter tile at a time, `terrain[qy][qx]`, two quarters per tile each way:
 * each quarter takes its tile's corner on that side. Only for what is shown (splashes, footprints);
 * wading is by whole tiles.
 */
export function readTerrainQuarters(map: TerrainSource): (string | undefined)[][] {
  const cornersAt = readCorners(map);
  return Array.from({ length: map.height * 2 }, (_, qy) =>
    Array.from(
      { length: map.width * 2 },
      (_, qx) => cornersAt(qx >> 1, qy >> 1)?.[(qy & 1) * 2 + (qx & 1)],
    ),
  );
}
