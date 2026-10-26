/** Takes a player out of the game: their room, their sprite and the scene's player list. */
export function removePlayer(scene: ServerScene, socketId: string) {
  const player = scene.players[socketId];
  /* Must clear room physics group + room refs (same path as respawn / door); otherwise
   * disconnected players stay in room.playerManager and NPCs / room logic still see them. */
  if (player?.room?.playerManager) {
    player.room.playerManager.remove(socketId);
  }
  player?.destroy(true);
  delete scene.players?.[socketId];
}
