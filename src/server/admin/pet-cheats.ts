import { STORED_PET_SLOTS } from "@/rules/capture";
import { movePetSlot, swapPet } from "@/server/pets";
import { subcommands, type Cheat } from "./cheat";

/*
 * Pet cheats: bring out or put away the pets you caught, which stay saved either way.
 * (Followers, from `/npc spawn ... follower` and `/npc follow`, are not pets: not touched here.)
 */

/** `/pet out`: makes your first stored pet the active one, if none is. */
const out: Cheat = (ctx, player, _args, reply) => {
  const slots = player.pets;
  if (slots.active) return reply.info(`${slots.active.name} is already out.`);
  const stored = STORED_PET_SLOTS.find((slot) => slots[slot]);
  if (!stored) return reply.error("You have no pet. Catch one first.");
  movePetSlot(ctx.world, player, stored, "active");
  reply.info(`${slots[stored]?.name} came out.`);
};

/** `/pet away`: stores your active pet; it stays yours. */
const away: Cheat = (ctx, player, _args, reply) => {
  const { active } = player.pets;
  if (!active) return reply.info("No pet is out.");
  swapPet(ctx.world, player, "active");
  if (player.pets.active) return reply.error("Your stores are full.");
  reply.info(`${active.name} is put away.`);
};

/** `/pet <out|away>`: bring out or put away the pets you caught. */
export const PET_CHEATS: Record<string, Cheat> = {
  pet: subcommands("pet", { out, away }),
};
