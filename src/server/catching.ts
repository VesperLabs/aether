import { getFullCharacterState } from "@/network/sync";
import { catchNpc, makeCompanion } from "./companions";
import { spawnNpc } from "./game-world";
import type { Npc } from "./npc";
import type { PlayerInRoom } from "./player-room";
import type { ServerWorld } from "./server-world";

/**
 * Catches a wild NPC for `owner`: they get a fresh copy as a companion, which dissolves in at their
 * feet, and the wild one drops and respawns at its spot, so the map never runs out. Returns the
 * companion, or undefined if the actor could not be spawned.
 */
export function catchAsCompanion(
  world: ServerWorld,
  owner: PlayerInRoom,
  wild: Npc,
  properties: { name: string; value: unknown }[] = [],
): Npc | undefined {
  const pet = spawnNpc(world, owner.room, {
    name: wild.name,
    x: owner.x,
    y: owner.y,
    properties,
  });
  if (!pet) return undefined;
  world.io.to(owner.roomName).emit("npcJoin", getFullCharacterState(pet));
  makeCompanion(pet, owner);
  catchNpc(wild);
  return pet;
}
