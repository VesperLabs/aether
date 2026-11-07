/**
 * Terrain grids and corner autotiling. A map is a grid of terrain letters, one per tile corner,
 * so a W×H tile map comes from a (W+1)×(H+1) grid. Tiles are chosen from the tileset's own
 * Tiled corner wangset, so the rules stay in Tiled, not here.
 */

export const TERRAINS = [
  { letter: "d", name: "dark grass", color: 1, preview: "#3f8f2a", blocks: false },
  { letter: "g", name: "grass", color: 2, preview: "#7cc142", blocks: false },
  { letter: "w", name: "water", color: 3, preview: "#3a7bd5", blocks: true },
  { letter: "s", name: "sand", color: 4, preview: "#c9b74a", blocks: false },
] as const;

export type TerrainLetter = (typeof TERRAINS)[number]["letter"];

/** Rows of terrain letters, top to bottom. */
export type TerrainGrid = string[];

interface WangTile {
  readonly tileid: number;
  readonly wangid: readonly number[];
}

export interface WangSet {
  readonly type: string;
  readonly wangtiles: readonly WangTile[];
}

/** Corners in wangid order: top-left, top-right, bottom-right, bottom-left. */
type Corners = readonly [number, number, number, number];

const CORNER_INDEXES = [7, 1, 3, 5] as const;

const DEFAULT_LETTER: TerrainLetter = "g";

const colorOf = (letter: string) =>
  TERRAINS.find((terrain) => terrain.letter === letter)?.color ??
  TERRAINS.find((terrain) => terrain.letter === DEFAULT_LETTER)!.color;

const isTerrainLetter = (letter: string): letter is TerrainLetter =>
  TERRAINS.some((terrain) => terrain.letter === letter);

/** Pads, trims and cleans a grid to exactly `width`×`height` known letters. */
export const normalizeGrid = (grid: TerrainGrid, width: number, height: number): TerrainGrid =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const letter = grid[y]?.[x] ?? DEFAULT_LETTER;
      return isTerrainLetter(letter) ? letter : DEFAULT_LETTER;
    }).join(""),
  );

export const blankGrid = (width: number, height: number): TerrainGrid =>
  normalizeGrid([], width, height);

export const setTerrain = (
  grid: TerrainGrid,
  x: number,
  y: number,
  letter: TerrainLetter,
): TerrainGrid =>
  grid.map((row, rowY) => (rowY === y ? row.slice(0, x) + letter + row.slice(x + 1) : row));

const mismatches = (a: Corners, b: readonly number[]) =>
  a.reduce((count, color, index) => count + (color === b[index] ? 0 : 1), 0);

/** Same corners always get the same variant, so re-tiling an unchanged spot is stable. */
const pickVariant = (tiles: readonly number[], x: number, y: number) =>
  tiles[Math.abs((x * 73856093) ^ (y * 19349663)) % tiles.length];

const createTilePicker = (wangset: WangSet) => {
  if (wangset.type !== "corner") throw new Error(`Expected a corner wangset, got ${wangset.type}`);
  const byCorners = new Map<string, number[]>();
  for (const { tileid, wangid } of wangset.wangtiles) {
    const key = CORNER_INDEXES.map((index) => wangid[index]).join();
    byCorners.set(key, [...(byCorners.get(key) ?? []), tileid]);
  }
  const known = [...byCorners.keys()].map((key) => key.split(",").map(Number));

  return (corners: Corners, x: number, y: number) => {
    const exact = byCorners.get(corners.join());
    if (exact) return pickVariant(exact, x, y);
    // The tileset has no tile for this mix (e.g. dark grass touching water): take the closest.
    const closest = known.reduce((best, option) =>
      mismatches(corners, option) < mismatches(corners, best) ? option : best,
    );
    return pickVariant(byCorners.get(closest.join())!, x, y);
  };
};

/** Tile ids (0-based within the tileset) for a (W+1)×(H+1) corner grid, row-major. */
export const autotile = (grid: TerrainGrid, wangset: WangSet): number[] => {
  const pick = createTilePicker(wangset);
  const tiles: number[] = [];
  for (let y = 0; y < grid.length - 1; y++) {
    for (let x = 0; x < grid[0].length - 1; x++) {
      const corners: Corners = [
        colorOf(grid[y][x]),
        colorOf(grid[y][x + 1]),
        colorOf(grid[y + 1][x + 1]),
        colorOf(grid[y + 1][x]),
      ];
      tiles.push(pick(corners, x, y));
    }
  }
  return tiles;
};

/** True per tile when at least half its corners are blocking terrain, so thin shores stay walkable. */
export const blockedTiles = (grid: TerrainGrid): boolean[] => {
  const blocks = (letter: string) =>
    TERRAINS.some((terrain) => terrain.letter === letter && terrain.blocks);
  const blocked: boolean[] = [];
  for (let y = 0; y < grid.length - 1; y++) {
    for (let x = 0; x < grid[0].length - 1; x++) {
      const corners = [grid[y][x], grid[y][x + 1], grid[y + 1][x], grid[y + 1][x + 1]];
      blocked.push(corners.filter(blocks).length >= 2);
    }
  }
  return blocked;
};
