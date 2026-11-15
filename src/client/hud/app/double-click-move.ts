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

/** Where a double-clicked item moves: always into an open slot, never swapping anything out. */
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
  /* Gear goes to the first open slot it fits: either hand, either ring */
  const open = EQUIPMENT_SLOTS.find(
    (slot) => checkSlotsMatch(item?.slot, slot) && isOpen(hero?.equipment, slot),
  );
  return open ? { from, to: { location: "equipment", slot: open } } : null;
}
