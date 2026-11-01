import type { GameEventBus, Timers } from "@/rules/world";

/** What an NPC needs to announce a windup. */
interface WindupSource {
  id: string;
  room: { name: string };
  world: { events: GameEventBus };
}

/** Tells the room an NPC attack or spell is coming, so clients can warn its target. */
export function emitNpcWindup(
  npc: WindupSource,
  action: { type: "attack" | "cast"; windupMs: number; abilitySlot?: string },
  targetId?: string,
) {
  npc.world.events.emit("npcWindupStarted", {
    npcId: npc.id,
    roomName: npc.room.name,
    kind: action.type,
    targetId,
    abilitySlot: action.abilitySlot,
    windupMs: action.windupMs,
  });
}

/** The windup an NPC has in progress. `seq` changes to call it off. */
export interface WindupTrack {
  seq: number;
  targetId?: string;
}

/** Runs `land` after the windup, unless `cancelWindupAt` called it off in the meantime. */
export function afterWindup(
  npc: { windup: WindupTrack; timers: Timers },
  windupMs: number,
  targetId: string | undefined,
  land: () => void,
) {
  const seq = ++npc.windup.seq;
  npc.windup.targetId = targetId;
  npc.timers.after(windupMs, () => {
    if (seq === npc.windup.seq) land();
  });
}

/** Calls off a windup aimed at `targetId`. True if there was one. */
export function cancelWindupAt(npc: { windup: WindupTrack }, targetId: string) {
  if (npc.windup.targetId !== targetId) return false;
  npc.windup.seq++;
  npc.windup.targetId = undefined;
  return true;
}
