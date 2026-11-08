import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";

/** The player or NPC with this id. A player's id is their socket id. */
export function findCharacter(
  world: ServerWorld,
  id: string | null | undefined,
): Player | Npc | undefined {
  if (!id) return;
  return world.players[id] ?? world.npcs[id];
}
