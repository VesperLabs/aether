import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";
import { createSpatialHash, type SpatialHash, type System } from "@/rules/world";

/** Cell size of the per-room lookups: a bit over a melee mob's aggro range. */
const CELL_SIZE = 64;

/** Who is where in one room, rebuilt each tick so NPCs find players and each other quickly. */
export interface RoomIndex {
  players: SpatialHash<Player>;
  npcs: SpatialHash<Npc>;
}

function buildRoomIndexes(world: ServerWorld): Record<string, RoomIndex> {
  const players: Record<string, Player[]> = {};
  const npcs: Record<string, Npc[]> = {};
  for (const player of Object.values(world.players)) {
    const name = player?.room?.name;
    if (name) (players[name] ??= []).push(player);
  }
  for (const npc of Object.values(world.npcs)) {
    const name = npc?.room?.name;
    if (name && !npc.state?.isDead) (npcs[name] ??= []).push(npc);
  }
  const indexes: Record<string, RoomIndex> = {};
  for (const name of Object.keys(world.rooms)) {
    indexes[name] = {
      players: createSpatialHash(CELL_SIZE, players[name] ?? []),
      npcs: createSpatialHash(CELL_SIZE, npcs[name] ?? []),
    };
  }
  return indexes;
}

/** Rebuilds every room's index. Runs after movement, before NPCs decide. */
export const indexRooms: System<ServerWorld> = (world) => {
  world.roomIndexes = buildRoomIndexes(world);
};

/** This tick's index for a room, built on the spot when the loop has not run (tests). */
export function getRoomIndex(world: ServerWorld, roomName: string): RoomIndex {
  return (world.roomIndexes?.[roomName] ?? buildRoomIndexes(world)[roomName]) as RoomIndex;
}
