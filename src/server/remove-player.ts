import { detachFromRoom } from "./player-room";
import type { ServerWorld } from "./server-world";
/** Takes a player out of the game: their room, their sprite and the world's player list. */
export function removePlayer(world: ServerWorld, socketId: string) {
  const player = world.players[socketId];
  /* Clear the room refs (same path as respawn / door); otherwise disconnected players stay in
   * the room and NPCs / room logic still see them. */
  if (player) {
    detachFromRoom(player);
  }
  delete world.players?.[socketId];
}
