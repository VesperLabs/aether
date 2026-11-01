import { spellDetails, type SpellDefinition } from "@/content";
import { LUNGE_DURATION, isLunging, type LungeState } from "@/rules/movement";
import type { NpcMovement } from "./decide";
import { NPC_LUNGE_RECOVERY_MS } from "./constants";

/** Lunges wind up like a weapon swing (its attack delay), not like a spell (its cast delay). */
export function isLungeSpell(spellName: string | undefined) {
  return !!(spellDetails as Record<string, SpellDefinition>)[spellName ?? ""]?.isLunge;
}

/** True through an NPC's lunge and the pause after it, when it can be punished. */
export function isRecoveringFromLunge(state: LungeState, now: number) {
  const elapsed = now - (state.lungeAt ?? -Infinity);
  return elapsed >= 0 && elapsed < (state.lungeMs ?? LUNGE_DURATION) + NPC_LUNGE_RECOVERY_MS;
}

/** Overrides whatever the NPC wanted to do: dash on, then stand still to recover. */
export function decideLungeMovement(state: LungeState, now: number): NpcMovement | undefined {
  if (isLunging(state, now)) return { type: "lunge", angle: state.lungeAngle ?? 0 };
  if (isRecoveringFromLunge(state, now)) return { type: "standStill" };
  return undefined;
}
