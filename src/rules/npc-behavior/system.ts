import type { GameEventBus } from "@/rules/world";

/**
 * Threat reacts to `characterDamaged`: an NPC that took damage gains threat on whoever dealt it, a
 * player or another NPC. `addThreat` applies it; non-NPC victims are ignored by the caller. Returns
 * an unsubscribe function.
 */
export function subscribeThreat(
  bus: GameEventBus,
  addThreat: (victimId: string, attackerId: string, amount: number) => void,
) {
  return bus.on("characterDamaged", ({ victimId, attackerId, amount }) => {
    if (attackerId && attackerId !== victimId) addThreat(victimId, attackerId, amount);
  });
}
