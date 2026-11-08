import type { ServerWorld } from "@/server/server-world";
import type { Actor } from "@/server/net/actor";

/**
 * The actor a bot's commands run as. Replies to the bot go nowhere for now; they become its inbox
 * once bots react to what they are told. A bot has no socket, so it sits in no socket rooms.
 */
export function botActor(world: ServerWorld): Actor {
  return {
    emit: (() => true) as Actor["emit"],
    toOthers: (room) => world.io.to(room),
    join: () => {},
    leave: () => {},
  };
}
