import { botPersonalities } from "@/content";
import { thinkBot } from "@/rules/bots";
import type { System } from "@/rules/world";
import type { CommandHandlers } from "@/server/net/dispatcher";
import { isInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import { act } from "./act";
import { perceive } from "./perceive";

/**
 * Lets every bot think and act. The brain paces its own slow layers, so most ticks only run its
 * reflexes. A bot between rooms (walking through a door) waits until it arrives.
 *
 * Takes the command handlers bots act through, the same ones player sockets use.
 */
export function thinkBots(handlers: CommandHandlers): System<ServerWorld> {
  return (world) => {
    for (const bot of Object.values(world.bots)) {
      const player = world.players[bot.id];
      if (bot.isPaused || !isInRoom(player)) continue;
      const { memory, intents } = thinkBot({
        view: perceive(world, bot, player),
        memory: bot.memory,
        personality: botPersonalities[bot.personality],
        rng: bot.rng,
      });
      bot.memory = memory;
      for (const intent of intents) act(world, handlers, bot, player, intent);
    }
  };
}
