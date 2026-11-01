import type { GameEventBus } from "@/rules/world";

/**
 * Threat reacts to `characterDamaged`: an NPC that took damage gains threat on the player who dealt
 * it. `addThreat` applies it to the NPC; non-NPC victims are ignored by the caller. Returns an
 * unsubscribe function.
 */
export function subscribeThreat(
  bus: GameEventBus,
  addThreat: (victimId: string, attackerSocketId: string, amount: number) => void,
) {
  return bus.on("characterDamaged", ({ victimId, attackerSocketId, amount }) => {
    if (attackerSocketId) addThreat(victimId, attackerSocketId, amount);
  });
}
