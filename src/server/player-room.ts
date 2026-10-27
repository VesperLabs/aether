import type { ServerWorld } from "./server-world";
import { Player, type PlayerArgs } from "./player";
import type { RoomData } from "@/rules/world";

/** A player that is in a room, so its room refs are set. */
export type PlayerInRoom = Player & { room: RoomData; roomName: string };

/** Whether this player exists and is in a room (not walking through a door or disconnected). */
export function isInRoom(player: Player | null | undefined): player is PlayerInRoom {
  return !!player?.room && !!player.roomName;
}

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
  world.players[socketId].state.targetNpcId = null;
}

/**
 * Clears a player's room refs, e.g. while they walk through a door or after they disconnect.
 */
export function detachFromRoom(player: Player) {
  player.room = null;
  player.roomName = null;
  player.state.targetNpcId = null;
}

/** Takes a player out of their room, e.g. while they walk through a door. */
export function removePlayerFromRoom(world: ServerWorld, socketId: string) {
  if (!world.players?.[socketId]) return console.log("❌ Could not remove player");
  detachFromRoom(world.players[socketId]);
}
