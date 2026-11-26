import { getPublicCharacterState } from "@/network/sync";
import { catchNpc, makeOwned } from "./owned-npcs";
import { spawnNpc } from "./game-world";
import { keepPet } from "./pets";
import type { Npc } from "./npc";
import type { PlayerInRoom } from "./player-room";
import type { ServerWorld } from "./server-world";

/**
 * Catches a wild NPC for `owner`: they get a fresh copy, which dissolves in at their
 * feet (saved to their account when `keep`, as a ball's catch is); the wild one drops and respawns at its spot, so the map
 * never runs out. Returns the copy, or undefined if the actor could not be spawned.
 */
export function catchAsOwned(
  world: ServerWorld,
  owner: PlayerInRoom,
  wild: Npc,
  properties: { name: string; value: unknown }[] = [],
  { asPet = false }: { asPet?: boolean } = {},
): Npc | undefined {
  const pet = spawnNpc(world, owner.room, {
    name: wild.name,
    x: owner.x,
    y: owner.y,
    /* The copy comes in the color of the one caught (a pink butterfly stays pink) */
    properties: [
      ...(wild.profile?.tint ? [{ name: "tint", value: wild.profile.tint }] : []),
      ...properties,
    ],
  });
  if (!pet) return undefined;
  /* Owned before the room hears of it, so it arrives as theirs */
  makeOwned(pet, owner);
  /* Kept in a store, it leaves the world at once: the room never sees it */
  const isOut = !asPet || keepPet(owner, pet);
  if (isOut) world.io.to(owner.roomName).emit("npcJoin", getPublicCharacterState(pet));
  catchNpc(wild);
  return pet;
}
