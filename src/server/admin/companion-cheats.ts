import { bringOutCompanions, putAwayCompanions } from "@/server/kept-companions";
import { subcommands, type Cheat } from "./cheat";

/*
 * Companion cheats: bring out or put away the companions you caught, which stay saved either way.
 * (`/npc spawn ... pet` and `/npc tame` pets are temporary and not touched here.)
 */

/** `/companion out`: brings your saved companions out at your feet. */
const out: Cheat = (ctx, player, _args, reply) => {
  if (player.companions.length === 0) return reply.error("You have no companion. Catch one first.");
  const brought = bringOutCompanions(ctx.world, player, { everyone: true });
  if (brought.length === 0) return reply.info("Your companion is already out.");
  reply.info(`${brought.map((pet) => pet.profile?.userName ?? pet.name).join(", ")} came out.`);
};

/** `/companion away`: puts your companions away; they stay saved. */
const away: Cheat = (ctx, player, _args, reply) => {
  const count = putAwayCompanions(ctx.world, player);
  if (count === 0) return reply.info("No companion is out.");
  reply.info(count === 1 ? "Your companion is put away." : `${count} companions put away.`);
};

/** `/companion <out|away>`: bring out or put away the companions you caught. */
export const COMPANION_CHEATS: Record<string, Cheat> = {
  companion: subcommands("companion", { out, away }),
};
