import { isActiveOut, STORED_PET_SLOTS } from "@/rules/capture";
import { movePetSlot, toggleActivePet } from "@/server/pets";
import { subcommands, type Cheat } from "./cheat";

/*
 * Pet cheats: bring out or put away the pets you caught, which stay saved either way.
 * (Followers, from `/npc spawn ... follower` and `/npc follow`, are not pets: not touched here.)
 */

/** `/pet out`: calls back your active pet if it's put away, else makes your first stored one active. */
const out: Cheat = (ctx, player, _args, reply) => {
  const slots = player.pets;
  if (slots.active && isActiveOut(slots)) return reply.info(`${slots.active.name} is already out.`);
  if (slots.active) {
    toggleActivePet(ctx.world, player);
    return reply.info(`${slots.active.name} came out.`);
  }
  const stored = STORED_PET_SLOTS.find((slot) => slots[slot]);
  if (!stored) return reply.error("You have no pet. Catch one first.");
  movePetSlot(ctx.world, player, stored, "active");
  reply.info(`${slots[stored]?.name} came out.`);
};

/** `/pet away`: puts your active pet away in its slot; it stays yours. */
const away: Cheat = (ctx, player, _args, reply) => {
  const { active } = player.pets;
  if (!active || !isActiveOut(player.pets)) return reply.info("No pet is out.");
  toggleActivePet(ctx.world, player);
  reply.info(`${active.name} is put away.`);
};

/** `/pet <out|away>`: bring out or put away the pets you caught. */
export const PET_CHEATS: Record<string, Cheat> = {
  pet: subcommands("pet", { out, away }),
};
