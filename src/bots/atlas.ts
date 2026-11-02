import type { Point } from "@/rules/world";
import {
  createPathfinder,
  labelRegions,
  readDoors,
  readTileMap,
  type DoorData,
  type Pathfinder,
  type TileMap,
  type TiledMapJson,
} from "@/rules/movement";

/**
 * Where a bot reads a room's map, as the browser loads the same map files. Hosts provide it
 * (files on disk, a fetch), so bots do no IO of their own.
 */
export type MapSource = (roomName: string) => TiledMapJson;

/** What a bot knows about a room from its map: walls, a pathfinder and the doors. */
export interface KnownRoom {
  map: TileMap;
  pathfinder: Pathfinder;
  doors: Record<string, DoorData>;
  /** Whether a path joins the two spots: walls can cut a map into separate areas. */
  connects(a: Point, b: Point): boolean;
}

/** Reads each room's map the first time it is asked for, then remembers it. */
export function createAtlas(source: MapSource) {
  const rooms = new Map<string, KnownRoom>();
  return (roomName: string): KnownRoom => {
    let room = rooms.get(roomName);
    if (!room) {
      const map = readTileMap(source(roomName));
      const regions = labelRegions(map.grid);
      const { tileWidth, tileHeight } = map.grid;
      const regionAt = ({ x, y }: Point) =>
        regions[Math.floor(y / tileHeight)]?.[Math.floor(x / tileWidth)] ?? -1;
      room = {
        map,
        pathfinder: createPathfinder(map.grid),
        doors: readDoors(map),
        connects: (a, b) => regionAt(a) !== -1 && regionAt(a) === regionAt(b),
      };
      rooms.set(roomName, room);
    }
    return room;
  };
}

/** How far around a door to look for open ground, in tiles. */
const DOORSTEP_SEARCH = 3;

/**
 * The open tile nearest a door that `from` can walk to, to stand on while using it: doors often
 * sit in a wall or at the map edge, where the pathfinder can't go. Undefined when there is none.
 */
export function findDoorstep(room: KnownRoom, door: DoorData, from: Point) {
  const { grid } = room.map;
  const { tileWidth, tileHeight } = grid;
  const centerX = Math.floor(door.centerPos.x / tileWidth);
  const centerY = Math.floor(door.centerPos.y / tileHeight);
  let best: { x: number; y: number } | undefined;
  let bestDistance = Infinity;
  for (let dy = -DOORSTEP_SEARCH; dy <= DOORSTEP_SEARCH; dy++) {
    for (let dx = -DOORSTEP_SEARCH; dx <= DOORSTEP_SEARCH; dx++) {
      const [x, y] = [centerX + dx, centerY + dy];
      if (grid.solid[y]?.[x] !== false) continue;
      const spot = { x: (x + 0.5) * tileWidth, y: (y + 0.5) * tileHeight };
      if (!room.connects(from, spot)) continue;
      const distance = Math.hypot(spot.x - door.centerPos.x, spot.y - door.centerPos.y);
      if (distance < bestDistance) [best, bestDistance] = [spot, distance];
    }
  }
  return best;
}

export type Atlas = ReturnType<typeof createAtlas>;
