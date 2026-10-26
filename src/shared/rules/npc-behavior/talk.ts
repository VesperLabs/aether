import { NPC_TALK_LATENCY_TOLERANCE, NPC_TALK_RANGE } from "./constants";

/** Where a character is: a position in a named room. */
export interface TalkPlacement {
  x: number;
  y: number;
  roomName?: string | null;
}

/**
 * Can a player talk to (or shop with) an NPC? Same room and within the talk range the client uses
 * to pick a target, plus a tolerance for the player walking on while the message travels.
 */
export function canTalkToNpc(
  player: TalkPlacement | null | undefined,
  npc: TalkPlacement | null | undefined,
): boolean {
  if (!player || !npc) return false;
  if (!player.roomName || player.roomName !== npc.roomName) return false;
  const dx = npc.x - player.x;
  const dy = npc.y - player.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  return Math.hypot(dx, dy) <= NPC_TALK_RANGE + NPC_TALK_LATENCY_TOLERANCE;
}
