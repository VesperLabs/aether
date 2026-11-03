import crypto from "crypto";
import type { Dice } from "@/content/items/dice";
import { createRng, type Rng } from "@/rules/world";

/** Offsets the id stream's seed from the rolls', so making an id never shifts a roll. */
const ID_STREAM = 0x9e3779b9;

/** A UUID-shaped id drawn from `rng`, so seeded runs make the same ids every time. */
function seededId(rng: Rng) {
  const hex = Array.from({ length: 32 }, () => Math.floor(rng() * 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The server's dice. Unseeded (the live server), rolls come from a random seed and ids are random
 * UUIDs, because items are saved and an id must never repeat across restarts. Seeded (simulations
 * and tests), rolls and ids both repeat, so a run can be replayed exactly.
 */
export function createServerDice(seed?: number): Dice {
  if (seed === undefined) {
    return { random: createRng(crypto.randomInt(2 ** 31)), newId: () => crypto.randomUUID() };
  }
  const ids = createRng((seed ^ ID_STREAM) >>> 0);
  return { random: createRng(seed), newId: () => seededId(ids) };
}
