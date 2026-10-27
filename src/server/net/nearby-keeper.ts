import { canTalkToNpc } from "@/rules/npc-behavior";
import type { ServerWorld } from "../server-world";

/**
 * The NPC with this id, if it exists and the player can talk to it right now (same room, in range).
 * Handlers use this so a client can never act on a keeper it is not standing next to.
 */
export function findNearbyNpc(world: ServerWorld, socketId: string, npcId: unknown) {
  const player = world?.players?.[socketId];
  if (!player || typeof npcId !== "string") return null;
  const npc = world.npcs?.[npcId];
  if (!npc) return null;
  const inRange = canTalkToNpc(
    { x: player.x, y: player.y, roomName: player.roomName },
    { x: npc.x, y: npc.y, roomName: npc.room?.name },
  );
  return inRange ? npc : null;
}
