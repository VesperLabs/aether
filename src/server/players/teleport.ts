import type { ServerWorld } from "@/server/world/server-world";
import { getFullCharacterState } from "@/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import { addPlayerToRoom, removePlayerFromRoom } from "@/server/world/player-room";
import { legacyUpdateMemberRoom } from "@/server/party/party-adapter";
import { saveMapDetails } from "@/server/persistence/save-player";

/** Teleports (doors, respawns) wipe a character's recent positions, so no hit rewinds across them. */
export function forgetPoses(world: ServerWorld, id: string) {
  for (const room of Object.values(world.rooms)) room.poseHistory.forget(id);
}

/**
 * Moves a player to a spot in any room and tells both rooms. Doors, travel cheats and
 * simulations all move players through this, so the client always resyncs from `heroInit`.
 */
export function teleportPlayer(
  world: ServerWorld,
  socketId: string,
  destMap: string,
  { x, y }: { x: number; y: number },
) {
  const player = world.players[socketId];
  const socket = world.io.sockets.sockets.get(socketId);
  if (!player?.room || !socket || !world.rooms[destMap]) return;
  const oldRoom = player.room.name;

  if (oldRoom !== destMap) {
    socket.leave(oldRoom);
    socket.join(destMap);
    socket.to(oldRoom).emit("remove", socketId);
    removePlayerFromRoom(world, socketId);
    addPlayerToRoom(world, socketId, world.rooms[destMap]);
  }

  player.x = x;
  player.y = y;
  forgetPoses(world, socketId);

  /* Save the new room */
  saveMapDetails(world, player);

  socket.to(destMap).emit("playerJoin", getFullCharacterState(player), {
    lastTeleport: world.now(),
  });

  socket.emit("heroInit", {
    ...getRoomState(world, destMap),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(world, player);
}
