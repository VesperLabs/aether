import EasyStar from "easystarjs";
import type { TileGrid } from "./tilemap";

/** How many tiles one search may visit before giving up, enough to cross the largest map. */
const MAX_ITERATIONS = 50_000;
/** A water tile costs this many land tiles to path through. */
const WATER_PATH_COST = 3;

/** A tile next to a wall costs this many open tiles to a body too wide to pass it cleanly. */
const TIGHT_PATH_COST = 20;

export interface Pathfinder {
  grid: TileGrid;
  tileWidth: number;
  tileHeight: number;
  /** One search grid per clearance (in tiles), built the first time a body that wide paths. */
  byClearance: Map<number, EasyStar.js>;
}

/**
 * Builds an A* pathfinder over the walls of a map. Diagonals are allowed, but not past a wall's
 * corner, where a body (wider than a point) would clip the wall.
 */
export function createPathfinder(grid: TileGrid): Pathfinder {
  return { grid, tileWidth: grid.tileWidth, tileHeight: grid.tileHeight, byClearance: new Map() };
}

/**
 * How many tiles a body of `radius` needs clear on every side of the tile it walks through: none
 * when it fits in one tile, more as it grows past that.
 */
function clearanceOf(pathfinder: Pathfinder, radius: number) {
  const tile = Math.min(pathfinder.tileWidth, pathfinder.tileHeight);
  return Math.max(0, Math.ceil((radius - tile / 2) / tile));
}

/**
 * The search grid for bodies needing `clearance` tiles. Tiles within that many of a wall stay
 * walkable but cost far more, so a big body goes the wide way round and only squeezes past a wall
 * when there is no other way (and can still start from beside one).
 */
function searchFor(pathfinder: Pathfinder, clearance: number): EasyStar.js {
  const cached = pathfinder.byClearance.get(clearance);
  if (cached) return cached;
  const { grid } = pathfinder;
  const isTight = (x: number, y: number) => {
    for (let dy = -clearance; dy <= clearance; dy++) {
      for (let dx = -clearance; dx <= clearance; dx++) {
        if (grid.solid[y + dy]?.[x + dx] ?? true) return true;
      }
    }
    return false;
  };
  const easystar = new EasyStar.js();
  // 0 open, 1 wall, 2 water, 3 tight, 4 tight water
  easystar.setGrid(
    grid.solid.map((row, y) =>
      row.map((solid, x) => {
        if (solid) return 1;
        const tight = clearance > 0 && isTight(x, y);
        if (grid.water[y][x]) return tight ? 4 : 2;
        return tight ? 3 : 0;
      }),
    ),
  );
  easystar.enableSync();
  easystar.setAcceptableTiles([0, 2, 3, 4]);
  easystar.enableDiagonals();
  easystar.disableCornerCutting();
  easystar.setIterationsPerCalculation(MAX_ITERATIONS);
  easystar.setTileCost(0, 0);
  /* Wading is slow, so paths go around water when the way round is short */
  easystar.setTileCost(2, WATER_PATH_COST);
  easystar.setTileCost(3, TIGHT_PATH_COST);
  easystar.setTileCost(4, TIGHT_PATH_COST + WATER_PATH_COST);
  pathfinder.byClearance.set(clearance, easystar);
  return easystar;
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
 * `radius` is the walker's half-width: a wide body keeps away from walls it would catch on.
 */
export function findPath(
  pathfinder: Pathfinder,
  from: { x: number; y: number },
  to: { x: number; y: number },
  avoid: AvoidZone[] = [],
  radius = 0,
): { x: number; y: number }[] | undefined {
  const { tileWidth, tileHeight } = pathfinder;
  const easystar = searchFor(pathfinder, clearanceOf(pathfinder, radius));
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
  radius = 0,
): { x: number; y: number } | undefined {
  return findPath(pathfinder, from, to, [], radius)?.[0];
}
