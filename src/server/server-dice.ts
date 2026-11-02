import crypto from "crypto";
import type { Dice } from "@/content";
import { createRng } from "@/rules/world";

/**
 * The live server's dice. Rolls come from a seeded RNG; ids are random UUIDs, because items are
 * saved and an id must never repeat across restarts. Simulations bring their own, fully seeded.
 */
export function createServerDice(seed = crypto.randomInt(2 ** 31)): Dice {
  return { random: createRng(seed), newId: () => crypto.randomUUID() };
}
