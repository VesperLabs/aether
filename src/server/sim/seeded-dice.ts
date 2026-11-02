import type { Dice } from "@/content";
import { createRng } from "@/rules/world";

/** Dice where ids are seeded too, so a simulation's every roll and every id repeat exactly. */
export function createSeededDice(seed: number): Dice {
  const ids = createRng(seed ^ 0x5eed);
  const hex = (length: number) =>
    Array.from({ length }, () => Math.floor(ids() * 16).toString(16)).join("");
  return {
    random: createRng(seed),
    newId: () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`,
  };
}
