import type { MobAttackStyle } from "@/content";
import { NPC_LUNGE_MS, type LungeState } from "@/rules/npc-behavior";
import type { GameEventBus, Point } from "@/rules/world";

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

/** What an NPC needs to lunge. */
interface LungeSource extends Point {
  attackStyle?: MobAttackStyle;
  state: LungeState;
  world: { now(): number };
  hasRangedWeapon(): boolean;
}

/**
 * Starts a lunge at `mark` (where the target stood when the windup began) for melee NPCs that
 * lunge. Returns the spell options that keep the hit on the NPC for the whole dash.
 */
export function startNpcLunge(npc: LungeSource, mark: Point): { followCasterMs?: number } {
  if (npc.attackStyle !== "lunge" || npc.hasRangedWeapon()) return {};
  npc.state.lungeAt = npc.world.now();
  npc.state.lungeAngle = Math.atan2(mark.y - npc.y, mark.x - npc.x);
  return { followCasterMs: NPC_LUNGE_MS };
}
