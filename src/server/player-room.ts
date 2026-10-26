import { Player } from "./player";

/** Creates a player and puts them in a room. */
export function createPlayer(world: ServerWorld, roomName: string, user: any): ServerPlayer {
  const room = world.rooms[roomName];
  const socketId = user?.socketId;
  const player = new Player(world, { ...user, id: socketId, room, roomName: room?.name });
  world.players[socketId] = player as unknown as ServerPlayer;
  return world.players[socketId];
}

/** Moves a player into a room. */
export function addPlayerToRoom(world: ServerWorld, socketId: string, room: Room) {
  world.players[socketId].room = room;
  world.players[socketId].roomName = room?.name;
}

/** Takes a player out of their room, e.g. while they walk through a door. */
export function removePlayerFromRoom(world: ServerWorld, socketId: string) {
  if (!world.players?.[socketId]) return console.log("❌ Could not remove player");
  world.players[socketId].room = null;
  world.players[socketId].roomName = null;
}
