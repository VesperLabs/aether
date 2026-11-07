import { TERRAINS, type TerrainGrid, type WangSet } from "./map-terrain";

/**
 * The tileset only has tiles for some corner mixes (no dark grass beside water, no checkerboards,
 * few three-way meetings). Repair changes unlocked corners around each tile that has no real tile,
 * the way Tiled's terrain brush does, so painting never leaves a tile to a best guess.
 */

const CORNER_INDEXES = [7, 1, 3, 5] as const;
/** Grass meets every other terrain, so it's the preferred filler when choices tie. */
const BRIDGE = "g";
const MAX_PASSES = 8;

type Point = readonly [number, number];

const pointKey = (x: number, y: number) => `${x},${y}`;

/** Tile (x, y)'s corners, top-left, top-right, bottom-right, bottom-left. */
const cornersOf = (x: number, y: number): Point[] => [
  [x, y],
  [x + 1, y],
  [x + 1, y + 1],
  [x, y + 1],
];

export const createRepair = (wangset: WangSet) => {
  const letterOf = (color: number) => TERRAINS.find((terrain) => terrain.color === color)?.letter;
  const known = new Set(
    wangset.wangtiles.map(({ wangid }) =>
      CORNER_INDEXES.map((index) => letterOf(wangid[index])).join(""),
    ),
  );
  const letters = TERRAINS.map(({ letter }) => letter);

  /** Corner grid → repaired grid. `locked` holds "x,y" corners that must keep their letter. */
  return (grid: TerrainGrid, locked: ReadonlySet<string> = new Set()): TerrainGrid => {
    const cells = grid.map((row) => [...row]);
    const tilesWide = cells[0].length - 1;
    const tilesHigh = cells.length - 1;
    const fixed = new Set(locked);

    const isTile = (x: number, y: number) => x >= 0 && y >= 0 && x < tilesWide && y < tilesHigh;
    const isValid = (x: number, y: number) =>
      known.has(
        cornersOf(x, y)
          .map(([cx, cy]) => cells[cy][cx])
          .join(""),
      );
    const invalidAround = (x: number, y: number) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (isTile(x + dx, y + dy) && !isValid(x + dx, y + dy)) count++;
        }
      }
      return count;
    };

    const fixTile = (x: number, y: number) => {
      const corners = cornersOf(x, y);
      const free = corners.filter(([cx, cy]) => !fixed.has(pointKey(cx, cy)));
      if (!free.length) return false;
      const original = free.map(([cx, cy]) => cells[cy][cx]);
      let best: { choice: string[]; score: number } | undefined;

      const total = letters.length ** free.length;
      for (let option = 0; option < total; option++) {
        const choice = free.map(
          (_, index) => letters[Math.floor(option / letters.length ** index) % letters.length],
        );
        free.forEach(([cx, cy], index) => (cells[cy][cx] = choice[index]));
        if (isValid(x, y)) {
          const changes = choice.filter((letter, index) => letter !== original[index]);
          const score =
            invalidAround(x, y) * 100 +
            changes.length * 10 +
            changes.filter((letter) => letter !== BRIDGE).length;
          if (!best || score < best.score) best = { choice, score };
        }
      }

      const chosen = best?.choice ?? original;
      free.forEach(([cx, cy], index) => {
        cells[cy][cx] = chosen[index];
        // What a fix settles stays settled, so later fixes can't undo it and loop forever.
        if (chosen[index] !== original[index]) fixed.add(pointKey(cx, cy));
      });
      return Boolean(best);
    };

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      for (let y = 0; y < tilesHigh; y++) {
        for (let x = 0; x < tilesWide; x++) {
          if (!isValid(x, y) && fixTile(x, y)) changed = true;
        }
      }
      if (!changed) break;
    }
    return cells.map((row) => row.join(""));
  };
};
