import EasyStar from "easystarjs";
import type { TileGrid } from "./tilemap";

/** How many tiles one search may visit before giving up, enough to cross the largest map. */
const MAX_ITERATIONS = 50_000;

export interface Pathfinder {
  easystar: EasyStar.js;
  tileWidth: number;
  tileHeight: number;
}

/**
 * Builds an A* pathfinder over the walls of a map. Diagonals are allowed, but not past a wall's
 * corner, where a body (wider than a point) would clip the wall.
 */
export function createPathfinder(grid: TileGrid): Pathfinder {
  const easystar = new EasyStar.js();
  easystar.setGrid(grid.solid.map((row) => row.map((solid) => (solid ? 1 : 0))));
  easystar.enableSync();
  easystar.setAcceptableTiles([0]);
  easystar.enableDiagonals();
  easystar.disableCornerCutting();
  easystar.setIterationsPerCalculation(MAX_ITERATIONS);
  easystar.setTileCost(1, 1);
  easystar.setTileCost(0, 0);
  return { easystar, tileWidth: grid.tileWidth, tileHeight: grid.tileHeight };
}

/** A circle a path should stay out of, such as the space around a monster. */
export interface AvoidZone {
  x: number;
  y: number;
  radius: number;
}

/**
 * The centres of the tiles to walk through on the way from `from` to `to`, the start tile left
 * out. Empty when already there; undefined when there is no path. Tiles inside an `avoid` zone are
 * treated as walls, except the start and end tiles, so a path can still begin or end in one.
 */
export function findPath(
  pathfinder: Pathfinder,
  from: { x: number; y: number },
  to: { x: number; y: number },
  avoid: AvoidZone[] = [],
): { x: number; y: number }[] | undefined {
  const { easystar, tileWidth, tileHeight } = pathfinder;
  const start = { x: Math.floor(from.x / tileWidth), y: Math.floor(from.y / tileHeight) };
  const end = { x: Math.floor(to.x / tileWidth), y: Math.floor(to.y / tileHeight) };
  for (const zone of avoid) {
    for (const tile of tilesInZone(zone, tileWidth, tileHeight)) {
      const isEnd = (t: typeof start) => t.x === tile.x && t.y === tile.y;
      if (!isEnd(start) && !isEnd(end)) easystar.avoidAdditionalPoint(tile.x, tile.y);
    }
  }
  let found: { x: number; y: number }[] | undefined;
  const search = easystar.findPath(start.x, start.y, end.x, end.y, (path) => {
    found = path?.slice(1).map((tile) => ({
      x: tile.x * tileWidth + tileWidth / 2,
      y: tile.y * tileHeight + tileHeight / 2,
    }));
  });
  easystar.calculate();
  /* A search that ran out of iterations would stay queued and block every later one */
  easystar.cancelPath(search);
  easystar.stopAvoidingAllAdditionalPoints();
  return found;
}

/** The tiles whose centres fall inside a zone. */
function tilesInZone({ x, y, radius }: AvoidZone, tileWidth: number, tileHeight: number) {
  const tiles: { x: number; y: number }[] = [];
  for (let ty = Math.floor((y - radius) / tileHeight); ty <= (y + radius) / tileHeight; ty++) {
    for (let tx = Math.floor((x - radius) / tileWidth); tx <= (x + radius) / tileWidth; tx++) {
      const cx = (tx + 0.5) * tileWidth;
      const cy = (ty + 0.5) * tileHeight;
      if (tx >= 0 && ty >= 0 && Math.hypot(cx - x, cy - y) <= radius) tiles.push({ x: tx, y: ty });
    }
  }
  return tiles;
}

/**
 * The centre of the tile an entity should walk to next on its way from `from` to `to`, or
 * undefined when there is no path or it is already there.
 */
export function findNextWaypoint(
  pathfinder: Pathfinder,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } | undefined {
  return findPath(pathfinder, from, to)?.[0];
}
