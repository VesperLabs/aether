import { getPublicCharacterState } from "@/network/sync";
import { catchNpc, makeCompanion } from "./companions";
import { spawnNpc } from "./game-world";
import { keepCompanion } from "./kept-companions";
import type { Npc } from "./npc";
import type { PlayerInRoom } from "./player-room";
import type { ServerWorld } from "./server-world";

/**
 * Catches a wild NPC for `owner`: they get a fresh copy as a companion, which dissolves in at their
 * feet (saved to their account when `keep`, as a ball's catch is); the wild one drops and respawns at its spot, so the map
 * never runs out. Returns the companion, or undefined if the actor could not be spawned.
 */
export function catchAsCompanion(
  world: ServerWorld,
  owner: PlayerInRoom,
  wild: Npc,
  properties: { name: string; value: unknown }[] = [],
  { keep = false }: { keep?: boolean } = {},
): Npc | undefined {
  const pet = spawnNpc(world, owner.room, {
    name: wild.name,
    x: owner.x,
    y: owner.y,
    properties,
  });
  if (!pet) return undefined;
  /* Owned before the room hears of it, so it arrives as a companion */
  makeCompanion(pet, owner);
  if (keep) keepCompanion(owner, pet);
  world.io.to(owner.roomName).emit("npcJoin", getPublicCharacterState(pet));
  catchNpc(wild);
  return pet;
}
