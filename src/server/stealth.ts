import { entitiesInRoom } from "@/rules/world";
import { pruneThreat } from "@/rules/npc-behavior";
import type { Player } from "./player";
import type { Npc } from "./npc";
import { cancelWindupAt } from "./npc-windup";

/**
 * Going into stealth gets a player out of danger: a moment where hits miss, and every NPC in the
 * room drops its threat on them, lets go of them and calls off any windup aimed at them.
 */
export function vanish(player: Player) {
  player.state.lastStealth = player.world.now();
  if (!player.roomName) return;
  const npcs = entitiesInRoom(player.world.npcs, player.roomName) as Npc[];
  for (const npc of npcs) {
    npc.threat = pruneThreat(npc.threat, (id) => id !== player.socketId);
    if (npc.state.lockedPlayerId === player.socketId) npc.setLockedPlayerId(null);
    if (cancelWindupAt(npc, player.socketId)) npc.state.isAiming = false;
  }
}
