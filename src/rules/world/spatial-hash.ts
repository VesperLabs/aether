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

/** Spreads cell x across keys; cell y stays far below it on any map (a million cells). */
const CELL_KEY_SPAN = 1 << 20;

export function createSpatialHash<T extends Point>(cellSize: number, items: T[]): SpatialHash<T> {
  const cells = new Map<number, T[]>();
  /* A number, not a "cx,cy" string: lookups run thousands of times a tick */
  const keyOf = (cx: number, cy: number) => cx * CELL_KEY_SPAN + cy;
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

  const visitCell = (x: number, y: number, visit: (item: T) => void) => {
    const cell = cells.get(keyOf(x, y));
    if (cell) for (const item of cell) visit(item);
  };

  /**
   * Visits the cells exactly `ring` steps from (cx, cy), column by column, top to bottom. Only the
   * ring's edge is walked (O(ring), not the whole square), in the same order a full scan would.
   */
  const inRing = (cx: number, cy: number, ring: number, visit: (item: T) => void) => {
    if (ring === 0) return visitCell(cx, cy, visit);
    for (let x = cx - ring; x <= cx + ring; x++) {
      if (x === cx - ring || x === cx + ring) {
        for (let y = cy - ring; y <= cy + ring; y++) visitCell(x, y, visit);
      } else {
        visitCell(x, cy - ring, visit);
        visitCell(x, cy + ring, visit);
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
