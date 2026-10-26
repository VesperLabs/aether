import type { ServerWorld } from "./server-world";
import { Player, type PlayerArgs } from "./player";
import type { RoomData } from "@/shared/rules/world";

/** Creates a player and puts them in a room. */
export function createPlayer(
  world: ServerWorld,
  roomName: string,
  user: PlayerArgs & { socketId: string },
): Player {
  const room = world.rooms[roomName];
  const socketId = user.socketId;
  const player = new Player(world, { ...user, id: socketId, room, roomName: room?.name });
  world.players[socketId] = player;
  return world.players[socketId];
}

/** Moves a player into a room. */
export function addPlayerToRoom(world: ServerWorld, socketId: string, room: RoomData) {
  world.players[socketId].room = room;
  world.players[socketId].roomName = room?.name;
}

/**
 * Clears a player's room refs, e.g. while they walk through a door or after they disconnect.
 * The shared character model types both as always set, hence the casts.
 */
export function detachFromRoom(player: Player) {
  player.room = null as unknown as RoomData;
  player.roomName = null as unknown as string;
}

/** Takes a player out of their room, e.g. while they walk through a door. */
export function removePlayerFromRoom(world: ServerWorld, socketId: string) {
  if (!world.players?.[socketId]) return console.log("❌ Could not remove player");
  detachFromRoom(world.players[socketId]);
}
