import { LOOT_SPAWN_CYCLE_TIME, parseMapLootList, type MapLoot } from "../loot";
import { createPartyState, type PartyState } from "../party";
import {
  createPathfinder,
  getObjectProperty,
  readTileMap,
  type Pathfinder,
  type TileMap,
  type TiledMapJson,
} from "../movement";
import { createGameEventBus, type GameEventBus } from "./event-bus";

/** A door on a map: where it is and where it leads. */
export interface DoorData {
  name: string;
  destMap?: string;
  destDoor?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where a player appears when they come out of this door. */
  centerPos: { x: number; y: number };
}

/** One map and everything the server keeps per map. Plain data. */
export interface RoomData {
  name: string;
  map: TileMap;
  pathfinder: Pathfinder;
  doors: Record<string, DoorData>;
  lootState: { mapLootList: MapLoot[]; lastMapLootSpawn: number };
  /** Monotonic per-room tick id for snapshots. */
  snapshotSeq: number;
  /** Last tick state sent to clients (for delta encoding). Cleared when the room has no one. */
  lastEmittedSnapshot: unknown;
}

/**
 * The whole game state: rooms, players, npcs, loot, doors, spells and party state, as plain
 * collections keyed by id, plus the event bus. Systems change it once per tick.
 */
export interface World<
  Player = unknown,
  Npc = unknown,
  Spell = unknown,
  Loot = unknown,
  Quest = unknown,
> {
  rooms: Record<string, RoomData>;
  players: Record<string, Player>;
  npcs: Record<string, Npc>;
  spells: Record<string, Spell>;
  loots: Record<string, Loot>;
  /** Doors by room name, then door name. */
  doors: Record<string, Record<string, DoorData>>;
  quests: Record<string, Quest>;
  partyState: PartyState;
  events: GameEventBus;
  /** Ticks run so far. */
  tick: number;
}

export function createWorld<P = unknown, N = unknown, S = unknown, L = unknown, Q = unknown>(
  quests: Record<string, Q> = {},
): World<P, N, S, L, Q> {
  return {
    rooms: {},
    players: {},
    npcs: {},
    spells: {},
    loots: {},
    doors: {},
    quests,
    partyState: createPartyState(),
    events: createGameEventBus(),
    tick: 0,
  };
}

function readDoors(map: TileMap): Record<string, DoorData> {
  const doors: Record<string, DoorData> = {};
  for (const door of map.objects.Doors ?? []) {
    const { name, x, y, width = 0, height = 0 } = door;
    doors[name] = {
      name,
      destMap: getObjectProperty<string>(door, "destMap"),
      destDoor: getObjectProperty<string>(door, "destDoor"),
      x,
      y,
      width,
      height,
      centerPos: { x: x + width / 2, y: y + height / 2 },
    };
  }
  return doors;
}

/** Builds a room from a Tiled map. */
export function createRoom(name: string, json: TiledMapJson, now: number): RoomData {
  const map = readTileMap(json);
  return {
    name,
    map,
    pathfinder: createPathfinder(map.grid),
    doors: readDoors(map),
    lootState: {
      mapLootList: parseMapLootList(map.objects.Loots),
      lastMapLootSpawn: now - LOOT_SPAWN_CYCLE_TIME,
    },
    snapshotSeq: 0,
    lastEmittedSnapshot: null,
  };
}

/** Adds a room to the world, along with its doors. */
export function addRoom(world: World, room: RoomData) {
  world.rooms[room.name] = room;
  world.doors[room.name] = room.doors;
}
