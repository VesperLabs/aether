import type { Rng } from "@/rules/world";
import type { Brain } from "../brain";
import type { Planner } from "../planner";
import { scriptedPlanner } from "./scripted-planner";
import { lingerFor, listOptions } from "./wander-options";

/** How long to wait before looking again when there is nowhere safe to go. */
const IDLE_MS = 1000;
/** How many rooms a wanderer remembers having been in, most recent last. */
const ROOM_MEMORY = 4;

/**
 * Roams the world: between goals it lists what it could safely do here (take a door, look at a
 * keeper, player or sign, stroll) and lets its planner choose, then walks there, giving monsters
 * a wide berth. Killed, it respawns and carries on.
 */
function wanderWith(makePlanner: (rng: Rng) => Planner): Brain {
  return async (bot, { clock, rng, signal }) => {
    const planner = makePlanner(rng);
    let recentRooms: string[] = [];
    let goalsHere = 0;
    while (!signal.aborted) {
      /* Like a player at the respawn screen, it gets right back up */
      if (bot.senses.isDead) {
        await bot.respawn();
        continue;
      }
      const { roomName } = bot.senses;
      if (recentRooms.at(-1) !== roomName) {
        recentRooms = [...recentRooms, roomName].slice(-ROOM_MEMORY);
        goalsHere = 0;
      }

      const options = listOptions(bot.senses, bot.room, rng);
      if (!options.length) {
        await clock.sleep(IDLE_MS);
        continue;
      }
      const { choice, pace } = await planner({ roomName, recentRooms, goalsHere, options });
      /* A slow planner may answer after the world moved on; look again rather than walk blind */
      const option = options[choice];
      if (!option || bot.senses.roomName !== roomName || bot.senses.isDead) continue;

      const arrived = await bot.travelTo(option.spot, { pace, avoidMobs: true });
      if (arrived && option.kind === "door") await bot.enterDoor(option.door.name);
      goalsHere++;
      await clock.sleep(lingerFor(option, rng));
    }
  };
}

/** Wanders by weighted dice and a temperament of its own. */
export const wander = wanderWith(scriptedPlanner);
