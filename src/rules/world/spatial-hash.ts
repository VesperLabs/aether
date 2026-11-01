import type { Point } from "./geometry";

/**
 * Entities bucketed into square cells, so "who is near this point" looks at a few cells instead of
 * every entity. Built once per tick from plain positions; it does not track movement.
 */
export interface SpatialHash<T extends Point> {
  readonly size: number;
  /** Every entity within `radius` of `point` (centre to centre). */
  near(point: Point, radius: number): T[];
  /** The closest entity, searching outward ring by ring, or undefined when there are none. */
  nearest(point: Point): T | undefined;
}

export function createSpatialHash<T extends Point>(cellSize: number, items: T[]): SpatialHash<T> {
  const cells = new Map<string, T[]>();
  const keyOf = (cx: number, cy: number) => `${cx},${cy}`;
  const cellOf = (value: number) => Math.floor(value / cellSize);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const cx = cellOf(item.x);
    const cy = cellOf(item.y);
    const key = keyOf(cx, cy);
    const cell = cells.get(key);
    if (cell) cell.push(item);
    else cells.set(key, [item]);
    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx);
    maxY = Math.max(maxY, cy);
  }

  const inRing = (cx: number, cy: number, ring: number, visit: (item: T) => void) => {
    for (let x = cx - ring; x <= cx + ring; x++) {
      for (let y = cy - ring; y <= cy + ring; y++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== ring) continue;
        for (const item of cells.get(keyOf(x, y)) ?? []) visit(item);
      }
    }
  };

  return {
    size: items.length,
    near(point, radius) {
      const found: T[] = [];
      const cx = cellOf(point.x);
      const cy = cellOf(point.y);
      const rings = Math.ceil(radius / cellSize);
      for (let ring = 0; ring <= rings; ring++) {
        inRing(cx, cy, ring, (item) => {
          if (Math.hypot(item.x - point.x, item.y - point.y) <= radius) found.push(item);
        });
      }
      return found;
    },
    nearest(point) {
      if (items.length === 0) return undefined;
      const cx = cellOf(point.x);
      const cy = cellOf(point.y);
      // Far enough to cover every occupied cell from wherever the point is.
      const maxRing = Math.max(cx - minX, maxX - cx, cy - minY, maxY - cy, 0);
      let closest: T | undefined;
      let closestDistance = Infinity;
      for (let ring = 0; ring <= maxRing; ring++) {
        inRing(cx, cy, ring, (item) => {
          const distance = Math.hypot(item.x - point.x, item.y - point.y);
          if (distance < closestDistance) {
            closest = item;
            closestDistance = distance;
          }
        });
        // Anything in a further ring is at least `ring * cellSize` away.
        if (closest && closestDistance <= ring * cellSize) break;
      }
      return closest;
    },
  };
}
