import type { GameEventBus } from "@/rules/world";

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
