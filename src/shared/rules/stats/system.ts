import type { MobKilledEvent } from "../events";
import type { GameEventBus } from "../world";
import { calculateExpValue } from "./rules";

/** Experience one kill is worth to everyone who shares it (based on the killer's level). */
export function expForMobKill(kill: MobKilledEvent): number {
  return calculateExpValue({ playerLevel: kill.killerLevel, mobLevel: kill.mobLevel });
}

/**
 * Experience reacts to `mobKilled`: every recipient gets the kill's exp value.
 * `awardExp` is how the host game applies it to a character (the rule itself holds no state).
 * Returns an unsubscribe function.
 */
export function subscribeStats(
  bus: GameEventBus,
  awardExp: (characterId: string, amount: number, kill: MobKilledEvent) => void,
): () => void {
  return bus.on("mobKilled", (kill) => {
    const amount = expForMobKill(kill);
    for (const characterId of kill.recipientIds) {
      awardExp(characterId, amount, kill);
    }
  });
}
