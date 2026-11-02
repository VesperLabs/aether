import type { TileGrid } from "./tilemap";

/**
 * Which connected area each open tile belongs to, by number; walls are -1. Two tiles share a
 * number exactly when the pathfinder can walk between them: it moves the same way, diagonals
 * included but never past a wall's corner.
 */
export function labelRegions(grid: TileGrid): number[][] {
  const { width, height, solid } = grid;
  const open = (x: number, y: number) => solid[y]?.[x] === false;
  const labels = solid.map((row) => row.map(() => -1));
  let next = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!open(x, y) || labels[y][x] !== -1) continue;
      const stack = [[x, y]];
      labels[y][x] = next;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const [nx, ny] = [cx + dx, cy + dy];
            if (!open(nx, ny) || labels[ny][nx] !== -1) continue;
            if (dx && dy && !(open(cx + dx, cy) && open(cx, cy + dy))) continue;
            labels[ny][nx] = next;
            stack.push([nx, ny]);
          }
        }
      }
      next++;
    }
  }
  return labels;
}
