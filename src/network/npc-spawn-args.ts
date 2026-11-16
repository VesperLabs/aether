/*
 * `/npc spawn <actor> [wild|pet] [count] [right hand] [left hand]`: each slot has its place, and
 * its first suggestion is its default (`wild`, `1`, `none`), so filling a later slot is a pick or
 * two away. Slots left off take their default. Read by `server/admin/npc-cheats.ts`.
 */

/** An argument, as `ChatArg` has it. */
interface SpawnArg {
  name: string;
  kind: "text" | "number" | "item";
  optional: true;
  words?: readonly string[];
}

/** Whether they are yours. */
export const SPAWN_SIDES = ["wild", "pet"] as const;
/** The word for a hand left as the actor has it. */
export const EMPTY_HAND = "none";

export const NPC_SPAWN_ARGS: SpawnArg[] = [
  { name: "wild|pet", kind: "text", optional: true, words: SPAWN_SIDES },
  { name: "count", kind: "number", optional: true },
  { name: "right hand", kind: "item", optional: true, words: [EMPTY_HAND] },
  { name: "left hand", kind: "item", optional: true, words: [EMPTY_HAND] },
];

const SIDE_OPTIONS = [
  { value: "wild", hint: "default: they fight anyone", pinned: true },
  { value: "pet", hint: "your companions", pinned: true },
];
const COUNT_OPTIONS = [
  { value: "1", hint: "default", pinned: true },
  ...[2, 3, 5, 10].map((count) => ({ value: String(count), hint: "how many" })),
];
const HAND_OPTION = { value: EMPTY_HAND, hint: "default: what the actor holds", pinned: true };
const HELD_TYPES = ["weapon", "ranged", "shield"];

/** Suggestions for slot `slot` after the actor (0 is wild or pet), its default first. */
export function completeNpcSpawn<T extends { hint?: string }>(slot: number, items: readonly T[]) {
  if (slot === 0) return SIDE_OPTIONS;
  if (slot === 1) return COUNT_OPTIONS;
  if (slot > 3) return [];
  return [HAND_OPTION, ...items.filter(({ hint }) => HELD_TYPES.includes(hint ?? ""))];
}
