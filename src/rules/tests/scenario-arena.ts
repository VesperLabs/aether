import type { TiledMapJson } from "../movement";
import {
  addRoom,
  createRoom,
  createTickLoop,
  realClock,
  createWorld,
  type RoomData,
  type System,
  type World,
} from "../world";

/** Milliseconds per tick in scenarios (20 ticks a second). */
export const TICK_MS = 50;
/** Wall clock at tick 0. */
export const START_NOW = 1_000_000;

const TILE = 32;
const ARENA_TILES = { width: 20, height: 10 };

/** Something that stands in the arena: a player or an npc. Plain data. */
export interface ArenaCharacter {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bodySize: number;
  hitBoxSize: { width: number; height: number };
  hp: number;
  isDead: boolean;
}

export type ArenaWorld = World<ArenaCharacter, ArenaCharacter>;

export function createArenaCharacter(
  id: string,
  x: number,
  y: number,
  over: Partial<ArenaCharacter> = {},
): ArenaCharacter {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    bodySize: 8,
    hitBoxSize: { width: 16, height: 32 },
    hp: 100,
    isDead: false,
    ...over,
  };
}

/** A Tiled map of empty ground, 640x320 pixels, with solid tiles at the given tile positions. */
function arenaMap(walls: ReadonlyArray<readonly [number, number]>): TiledMapJson {
  const { width, height } = ARENA_TILES;
  const data = new Array<number>(width * height).fill(0);
  for (const [tx, ty] of walls) data[ty * width + tx] = 2;
  return {
    width,
    height,
    tilewidth: TILE,
    tileheight: TILE,
    tilesets: [
      { firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] },
    ],
    layers: [{ name: "Collide", type: "tilelayer", data }],
  };
}

export interface Arena {
  world: ArenaWorld;
  room: RoomData;
  addPlayer<C extends ArenaCharacter>(character: C): C;
  addNpc<C extends ArenaCharacter>(character: C): C;
  /**
   * Runs `ticks` ticks. Each runs the given systems in order, then writes down where everyone
   * stands in the room's pose history, like the server does. Returns the wall clock afterwards.
   */
  run(ticks: number, ...systems: Array<System<ArenaWorld>>): number;
}

/** One empty room in a world, with a manual clock so scenarios replay exactly. */
export function createArena(options: { walls?: ReadonlyArray<readonly [number, number]> } = {}) {
  const world: ArenaWorld = createWorld();
  const room = createRoom("arena", arenaMap(options.walls ?? []), START_NOW);
  addRoom(world, room);
  let clock = START_NOW;

  const arena: Arena = {
    world,
    room,
    addPlayer: (character) => {
      world.players[character.id] = character;
      return character;
    },
    addNpc: (character) => {
      world.npcs[character.id] = character;
      return character;
    },
    run(ticks, ...systems) {
      const recordPoses: System<ArenaWorld> = (w, frame) =>
        room.poseHistory.record(frame.now, [...Object.values(w.players), ...Object.values(w.npcs)]);
      const loop = createTickLoop(world, [...systems, recordPoses], {
        fps: 1000 / TICK_MS,
        clock: { ...realClock, now: () => clock },
      });
      for (let i = 0; i < ticks; i++) {
        clock += TICK_MS;
        loop.step(TICK_MS);
      }
      return clock;
    },
  };
  return arena;
}
