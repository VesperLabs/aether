import type { BotView } from "@/rules/bots";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import type { Bot } from "./bot";

/** Copies what a bot can see out of the live world into plain data for its brain. */
export function perceive(world: ServerWorld, bot: Bot, player: PlayerInRoom): BotView {
  return {
    now: world.now(),
    self: {
      id: player.id,
      roomName: player.roomName,
      x: player.x,
      y: player.y,
      hp: player.stats?.hp ?? 0,
      maxHp: player.stats?.maxHp ?? 0,
      isDead: !!player.state?.isDead,
      home: bot.home,
      walk: bot.walk && { to: bot.walk.to, status: bot.walk.status },
    },
  };
}
