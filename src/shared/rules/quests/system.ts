import type { MobKilledEvent } from "../events";
import type { GameEventBus } from "../world";

/**
 * Kill-count objectives react to `mobKilled`: every recipient gets one more kill of that mob.
 * `addKill` is how the host game records it on a character (the rule itself holds no state).
 * Returns an unsubscribe function.
 */
export function subscribeQuests(
  bus: GameEventBus,
  addKill: (characterId: string, mobName: string, kill: MobKilledEvent) => void,
): () => void {
  return bus.on("mobKilled", (kill) => {
    for (const characterId of kill.recipientIds) {
      addKill(characterId, kill.mobName, kill);
    }
  });
}
