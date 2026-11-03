import crypto from "crypto";
import type { Dice } from "@/content";
import { createRng } from "@/rules/world";

/**
 * The server's dice. Rolls come from a seeded RNG. Without a seed, ids are random UUIDs, because
 * items are saved and an id must never repeat across restarts. With a seed, ids count up from it
 * too, so NPCs (whose rolls are seeded from their ids) replay exactly: for tests and tools only.
 */
export function createServerDice(seed?: number): Dice {
  if (seed === undefined) {
    return { random: createRng(crypto.randomInt(2 ** 31)), newId: () => crypto.randomUUID() };
  }
  let next = 0;
  return { random: createRng(seed), newId: () => `${seed}-${next++}` };
}
