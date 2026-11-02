import type { Brain } from "../brain";
import { pickGoal, rollTemperament, ROOM_MEMORY, type WanderMemory } from "./wander-goals";

/** How long to wait before looking again when there is nowhere safe to go. */
const IDLE_MS = 1000;

/**
 * Roams the world at its own pace: strolls to open spots, goes over to look at keepers, players
 * and signs, and grows restless the longer it stays, until it takes a door, preferring rooms it
 * hasn't seen lately. It gives monsters a wide berth. Killed, it respawns and carries on.
 */
export const wander: Brain = async (bot, { clock, rng, signal }) => {
  const temperament = rollTemperament(rng);
  const memory: WanderMemory = { recentRooms: [], goalsHere: 0 };
  while (!signal.aborted) {
    /* Like a player at the respawn screen, it gets right back up */
    if (bot.senses.isDead) {
      await bot.respawn();
      continue;
    }
    const { roomName } = bot.senses;
    if (memory.recentRooms.at(-1) !== roomName) {
      memory.recentRooms = [...memory.recentRooms, roomName].slice(-ROOM_MEMORY);
      memory.goalsHere = 0;
    }

    const goal = pickGoal(bot.senses, bot.room, { temperament, memory, rng });
    if (!goal) {
      await clock.sleep(IDLE_MS);
      continue;
    }
    const arrived = await bot.travelTo(goal.spot, { pace: temperament.pace, avoidMobs: true });
    if (arrived && goal.kind === "door") await bot.enterDoor(goal.door.name);
    memory.goalsHere++;
    await clock.sleep(goal.lingerMs);
  }
};
