import type { BuiltItem } from "@/content";
import {
  ABILITY_SLOTS,
  checkSlotsMatch,
  EQUIPMENT_SLOTS,
  MAX_INVENTORY_ITEMS,
} from "@/rules/inventory";

type Slots = Record<string, unknown> | undefined;

interface Hero {
  inventory?: ReadonlyArray<unknown>;
  equipment?: Slots;
  abilities?: Slots;
}

interface Picked {
  item: BuiltItem;
  location: string;
  slotKey?: string;
  bagId?: string;
}

/**
 * Where a double-clicked item moves: into an open slot, or for gear with every fitting slot full,
 * swapped with what the first one holds (the server checks the swap is allowed).
 */
export function doubleClickMove(
  hero: Hero | null | undefined,
  { item, location, slotKey, bagId }: Picked,
) {
  const from = { bagId, slot: slotKey, location };
  const isOpen = (slots: Slots, slot: string) => !slots?.[slot];

  /* Worn gear and slotted spells come off into the first open inventory slot */
  if (location === "equipment" || (location === "abilities" && item?.type === "spell")) {
    const inventory = hero?.inventory ?? [];
    const open = Array.from({ length: MAX_INVENTORY_ITEMS }, (_, i) => i).find(
      (i) => !inventory[i],
    );
    return open === undefined ? null : { from, to: { location: "inventory", slot: open } };
  }
  if (location !== "inventory" && location !== "bag") return null;

  /* Spells go to the first open ability slot */
  if (item?.type === "spell") {
    const open = ABILITY_SLOTS.find((slot) => isOpen(hero?.abilities, slot));
    return open ? { from, to: { location: "abilities", slot: open } } : null;
  }
  /* Gear goes to the first open slot it fits (either hand, either ring), else swaps into the first */
  const fits = EQUIPMENT_SLOTS.filter((slot) => checkSlotsMatch(item?.slot, slot));
  const slot = fits.find((each) => isOpen(hero?.equipment, each)) ?? fits[0];
  return slot ? { from, to: { location: "equipment", slot } } : null;
}
