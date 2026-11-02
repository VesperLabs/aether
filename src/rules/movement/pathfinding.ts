import EasyStar from "easystarjs";
import type { TileGrid } from "./tilemap";

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
  easystar.setIterationsPerCalculation(1000);
  easystar.setTileCost(1, 1);
  easystar.setTileCost(0, 0);
  return { easystar, tileWidth: grid.tileWidth, tileHeight: grid.tileHeight };
}

/**
 * The centres of the tiles to walk through on the way from `from` to `to`, the start tile left
 * out. Empty when already there; undefined when there is no path.
 */
export function findPath(
  pathfinder: Pathfinder,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | undefined {
  const { easystar, tileWidth, tileHeight } = pathfinder;
  let found: { x: number; y: number }[] | undefined;
  easystar.findPath(
    Math.floor(from.x / tileWidth),
    Math.floor(from.y / tileHeight),
    Math.floor(to.x / tileWidth),
    Math.floor(to.y / tileHeight),
    (path) => {
      found = path?.slice(1).map((tile) => ({
        x: tile.x * tileWidth + tileWidth / 2,
        y: tile.y * tileHeight + tileHeight / 2,
      }));
    },
  );
  easystar.calculate();
  return found;
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
