import EasyStar from "easystarjs";
import type { TileGrid } from "./tilemap";

export interface Pathfinder {
  easystar: EasyStar.js;
  tileWidth: number;
  tileHeight: number;
}

/** Builds an A* pathfinder over the walls of a map. Diagonals are allowed, solid tiles are not. */
export function createPathfinder(grid: TileGrid): Pathfinder {
  const easystar = new EasyStar.js();
  easystar.setGrid(grid.solid.map((row) => row.map((solid) => (solid ? 1 : 0))));
  easystar.enableSync();
  easystar.setAcceptableTiles([0]);
  easystar.enableDiagonals();
  easystar.setIterationsPerCalculation(1000);
  easystar.setTileCost(1, 1);
  easystar.setTileCost(0, 0);
  return { easystar, tileWidth: grid.tileWidth, tileHeight: grid.tileHeight };
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
  const { easystar, tileWidth, tileHeight } = pathfinder;
  let next: { x: number; y: number } | undefined;
  easystar.findPath(
    Math.floor(from.x / tileWidth),
    Math.floor(from.y / tileHeight),
    Math.floor(to.x / tileWidth),
    Math.floor(to.y / tileHeight),
    (path) => {
      const tile = path?.[1];
      if (tile) {
        next = { x: tile.x * tileWidth + tileWidth / 2, y: tile.y * tileHeight + tileHeight / 2 };
      }
    },
  );
  easystar.calculate();
  return next;
}
