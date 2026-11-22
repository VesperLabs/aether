/** A painted `Extras` cell: whether its tileset marks it `base`, the bottom tile of a prop. */
export interface ExtrasCell {
  base: boolean;
  /** A `base` tile that never joins the `base` tiles beside it (one with its own `sortOffset`). */
  alone?: boolean;
}

/** A cell of the layer, `[row, column]`. */
export type CellAt = readonly [number, number];

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Whether a cell is painted, not a `base` tile and not yet in a prop. */
type Free = (row: number, column: number) => boolean;

/** The free cells stacked with `[row, column]` in its column, top to bottom. */
function runAt(free: Free, row: number, column: number): CellAt[] {
  let top = row;
  let bottom = row;
  while (free(top - 1, column)) top--;
  while (free(bottom + 1, column)) bottom++;
  return Array.from({ length: bottom - top + 1 }, (_, i): CellAt => [top + i, column]);
}

/**
 * The props painted on the layer. A `base` tile is the bottom of a prop, joined by the `base` tiles
 * beside it in its row: it takes the tiles stacked on it in its column, up to the next `base` tile, and the columns beside those that hang off it
 * (end above its bottom, like a tree's leaves beside its trunk). Columns that reach its bottom row
 * or lower stand on their own (a bush beside a fence). Every other tile joins the tiles it touches
 * in any direction, so a tree, a row of crates or a stack of barrels sorts as one thing.
 * `grid[row][column]`, `null` where empty.
 */
export function findProps(grid: (ExtrasCell | null)[][]): CellAt[][] {
  const seen = grid.map((row) => row.map(() => false));
  const free: Free = (row, column) => {
    const cell = grid[row]?.[column];
    return !!cell && !cell.base && !seen[row][column];
  };
  const claim = (prop: CellAt[], cells: CellAt[]) => {
    for (const [r, c] of cells) seen[r][c] = true;
    prop.push(...cells);
  };
  const props: CellAt[][] = [];

  /*
   * Every base takes its own column first, so no hanging column steals from another base. Bases
   * side by side in a row are one prop (a tree flagged across its bottom, a straight fence).
   */
  const bases: { row: number; prop: CellAt[] }[] = [];
  const joinsRow = (row: number, column: number) => {
    const cell = grid[row]?.[column];
    return !!cell?.base && !cell.alone && !seen[row][column];
  };
  grid.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (!cell?.base || seen[row][column]) return;
      const prop: CellAt[] = [];
      for (let c = column; c === column || (!cell.alone && joinsRow(row, c)); c++) {
        seen[row][c] = true;
        prop.push([row, c]);
        if (free(row - 1, c)) claim(prop, runAt(free, row - 1, c));
      }
      bases.push({ row, prop });
      props.push(prop);
    }),
  );
  /* Spread from every base at once, one column a step, so a hanging column goes to the nearest base */
  const frontier = bases.flatMap(({ row, prop }) => prop.map((cell) => ({ cell, row, prop })));
  for (let i = 0; i < frontier.length; i++) {
    const { cell, row, prop } = frontier[i];
    const [r, c] = cell;
    for (const side of [c - 1, c + 1]) {
      if (!free(r, side)) continue;
      const run = runAt(free, r, side);
      if (run[run.length - 1][0] >= row) continue;
      claim(prop, run);
      frontier.push(...run.map((next) => ({ cell: next, row, prop })));
    }
  }

  grid.forEach((cells, row) =>
    cells.forEach((_, column) => {
      if (!free(row, column)) return;
      const prop: CellAt[] = [];
      claim(prop, [[row, column]]);
      for (let i = 0; i < prop.length; i++) {
        const [r, c] = prop[i];
        for (const [dr, dc] of NEIGHBOURS) {
          if (free(r + dr, c + dc)) claim(prop, [[r + dr, c + dc]]);
        }
      }
      props.push(prop);
    }),
  );
  return props;
}

/**
 * Where a prop stands, in px from the top of the layer: its lowest solid pixel anywhere, so trees
 * that touch still stand on their trunks, wherever in the prop those are. `lowestSolid` gives a
 * cell's lowest solid pixel row in its tile, or `null` if it has none. A prop with nothing solid
 * stands on its bottom edge.
 */
export function propFoot(
  prop: CellAt[],
  tileHeight: number,
  lowestSolid: (cell: CellAt) => number | null,
): number {
  let foot: number | null = null;
  for (const cell of prop) {
    const y = lowestSolid(cell);
    if (y !== null) foot = Math.max(foot ?? 0, cell[0] * tileHeight + y + 1);
  }
  return foot ?? (Math.max(...prop.map(([r]) => r)) + 1) * tileHeight;
}
