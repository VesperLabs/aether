import type { BotIntent } from "@/rules/bots";
import type { CommandHandlers } from "@/server/net/dispatcher";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import type { Bot } from "./bot";
import { startWalk, stopWalk } from "./navigation";

/**
 * Carries out an intent. Anything a player could do goes through the same command handler their
 * client's command would, so a bot can do nothing a player can't. Walking is the exception: a
 * player's client moves them, so the server moves a bot itself (see `navigation.ts`).
 */
export function act(
  world: ServerWorld,
  handlers: CommandHandlers,
  bot: Bot,
  player: PlayerInRoom,
  intent: BotIntent,
) {
  switch (intent.type) {
    case "stop":
      return stopWalk(bot, player);
    case "walkTo":
      return startWalk(world, bot, player, intent.to);
    case "respawn":
      return handlers.respawn(bot.ctx, undefined);
  }
}
